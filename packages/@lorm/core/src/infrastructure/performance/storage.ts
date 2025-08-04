import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { PerformanceSummary, PerformanceConfiguration } from './types.js';

/**
 * Performance data storage manager
 * Handles persistence of performance sessions and history management
 */
export class PerformanceStorage {
  private storageDir: string;
  private config: PerformanceConfiguration['storage'];

  constructor(config?: Partial<PerformanceConfiguration['storage']>) {
    this.config = {
      enabled: true,
      maxSessions: 100,
      retentionDays: 30,
      ...config
    };
    
    // Store performance data in user's home directory
    this.storageDir = join(homedir(), '.lorm', 'performance');
  }

  /**
   * Initialize storage directory
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Get storage file path for a session
   */
  private getSessionFilePath(sessionId: string): string {
    return join(this.storageDir, `${sessionId}.json`);
  }

  /**
   * Get index file path for session metadata
   */
  private getIndexFilePath(): string {
    return join(this.storageDir, 'index.json');
  }

  /**
   * Load session index
   */
  private async loadIndex(): Promise<SessionIndex> {
    try {
      const indexPath = this.getIndexFilePath();
      const indexData = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(indexData);
    } catch {
      return { sessions: [], lastCleanup: Date.now() };
    }
  }

  /**
   * Save session index
   */
  private async saveIndex(index: SessionIndex): Promise<void> {
    const indexPath = this.getIndexFilePath();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Save a performance session
   */
  async saveSession(session: PerformanceSummary): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.ensureStorageDir();
      
      // Save session data
      const sessionPath = this.getSessionFilePath(session.sessionId);
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
      
      // Update index
      const index = await this.loadIndex();
      const sessionMeta: SessionMetadata = {
        id: session.sessionId,
        timestamp: session.startTime,
        duration: session.totalDuration,
        operationCount: session.operations.length,
        errorCount: session.errors.length,
        warningCount: session.warnings.length
      };
      
      // Add new session and sort by timestamp (newest first)
      index.sessions.unshift(sessionMeta);
      index.sessions = index.sessions.slice(0, this.config.maxSessions);
      
      await this.saveIndex(index);
      
      // Cleanup old sessions if needed
      await this.cleanupOldSessions();
    } catch (error) {
      console.warn('Failed to save performance session:', error);
    }
  }

  /**
   * Load performance sessions
   */
  async loadSessions(limit?: number): Promise<PerformanceSummary[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      await this.ensureStorageDir();
      const index = await this.loadIndex();
      
      const sessionsToLoad = limit ? index.sessions.slice(0, limit) : index.sessions;
      const sessions: PerformanceSummary[] = [];
      
      for (const sessionMeta of sessionsToLoad) {
        try {
          const sessionPath = this.getSessionFilePath(sessionMeta.id);
          const sessionData = await fs.readFile(sessionPath, 'utf-8');
          const session = JSON.parse(sessionData) as PerformanceSummary;
          sessions.push(session);
        } catch (error) {
          console.warn(`Failed to load session ${sessionMeta.id}:`, error);
          // Remove invalid session from index
          const updatedIndex = await this.loadIndex();
          updatedIndex.sessions = updatedIndex.sessions.filter(s => s.id !== sessionMeta.id);
          await this.saveIndex(updatedIndex);
        }
      }
      
      return sessions;
    } catch (error) {
      console.warn('Failed to load performance sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(sessionId: string): Promise<PerformanceSummary | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const sessionPath = this.getSessionFilePath(sessionId);
      const sessionData = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(sessionData) as PerformanceSummary;
    } catch {
      return null;
    }
  }

  /**
   * Clear all performance sessions
   */
  async clearSessions(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.ensureStorageDir();
      const index = await this.loadIndex();
      
      // Delete all session files
      for (const sessionMeta of index.sessions) {
        try {
          const sessionPath = this.getSessionFilePath(sessionMeta.id);
          await fs.unlink(sessionPath);
        } catch {
          // Ignore errors for individual file deletion
        }
      }
      
      // Clear index
      await this.saveIndex({ sessions: [], lastCleanup: Date.now() });
    } catch (error) {
      console.warn('Failed to clear performance sessions:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    if (!this.config.enabled) {
      return {
        sessionCount: 0,
        totalSize: 0,
        oldestSession: null,
        newestSession: null
      };
    }

    try {
      const index = await this.loadIndex();
      let totalSize = 0;
      
      // Calculate total size
      for (const sessionMeta of index.sessions) {
        try {
          const sessionPath = this.getSessionFilePath(sessionMeta.id);
          const stats = await fs.stat(sessionPath);
          totalSize += stats.size;
        } catch {
          // Ignore errors for individual files
        }
      }
      
      return {
        sessionCount: index.sessions.length,
        totalSize,
        oldestSession: index.sessions.length > 0 ? index.sessions[index.sessions.length - 1] : null,
        newestSession: index.sessions.length > 0 ? index.sessions[0] : null
      };
    } catch {
      return {
        sessionCount: 0,
        totalSize: 0,
        oldestSession: null,
        newestSession: null
      };
    }
  }

  /**
   * Cleanup old sessions based on retention policy
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const index = await this.loadIndex();
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
      
      // Only cleanup once per day
      if (now - index.lastCleanup < 24 * 60 * 60 * 1000) {
        return;
      }
      
      const cutoffTime = now - retentionMs;
      const sessionsToKeep: SessionMetadata[] = [];
      const sessionsToDelete: SessionMetadata[] = [];
      
      for (const sessionMeta of index.sessions) {
        if (sessionMeta.timestamp > cutoffTime) {
          sessionsToKeep.push(sessionMeta);
        } else {
          sessionsToDelete.push(sessionMeta);
        }
      }
      
      // Delete old session files
      for (const sessionMeta of sessionsToDelete) {
        try {
          const sessionPath = this.getSessionFilePath(sessionMeta.id);
          await fs.unlink(sessionPath);
        } catch {
          // Ignore errors for individual file deletion
        }
      }
      
      // Update index
      index.sessions = sessionsToKeep;
      index.lastCleanup = now;
      await this.saveIndex(index);
      
      if (sessionsToDelete.length > 0) {
        console.log(`Cleaned up ${sessionsToDelete.length} old performance sessions`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Update storage configuration
   */
  updateConfig(config: Partial<PerformanceConfiguration['storage']>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current storage configuration
   */
  getConfig(): PerformanceConfiguration['storage'] {
    return { ...this.config };
  }
}

/**
 * Session metadata for indexing
 */
interface SessionMetadata {
  id: string;
  timestamp: number;
  duration: number;
  operationCount: number;
  errorCount: number;
  warningCount: number;
}

/**
 * Session index structure
 */
interface SessionIndex {
  sessions: SessionMetadata[];
  lastCleanup: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  sessionCount: number;
  totalSize: number;
  oldestSession: SessionMetadata | null;
  newestSession: SessionMetadata | null;
}