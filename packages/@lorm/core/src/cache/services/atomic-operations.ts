/**
 * Atomic File Operations Service
 * Provides atomic write operations to prevent data corruption during cache operations
 */

import { writeFile, readFile, unlink, rename, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { randomBytes } from "crypto";
import { mkdir } from "fs/promises";

export interface AtomicWriteOptions {
  /** Create backup of existing file before writing */
  createBackup: boolean;
  /** Clean up backup after successful write */
  cleanupBackup: boolean;
  /** Verify write by reading back the data */
  verifyWrite: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts (ms) */
  retryDelay: number;
  /** Enable detailed logging */
  enableLogging: boolean;
}

export interface AtomicWriteResult {
  success: boolean;
  bytesWritten: number;
  duration: number;
  retryCount: number;
  error?: string;
  backupPath?: string;
  verified?: boolean;
}

export class AtomicFileOperations {
  private options: AtomicWriteOptions;

  constructor(options: Partial<AtomicWriteOptions> = {}) {
    this.options = {
      createBackup: true,
      cleanupBackup: true,
      verifyWrite: true,
      maxRetries: 3,
      retryDelay: 100,
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };
  }

  /**
   * Atomically write data to a file using temporary file + rename strategy
   */
  async writeFile(filePath: string, data: string | Buffer, options?: Partial<AtomicWriteOptions>): Promise<AtomicWriteResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let backupPath: string | undefined;
    
    // Merge options with instance defaults
    const effectiveOptions = { ...this.options, ...options };

    while (retryCount <= this.options.maxRetries) {
      try {
        // Ensure directory exists
        await this.ensureDirectory(dirname(filePath));

        // Create backup if file exists and backup is enabled
        if (effectiveOptions.createBackup && existsSync(filePath)) {
          backupPath = await this.createBackup(filePath);
        }

        // Generate temporary file path
        const tempPath = this.generateTempPath(filePath);

        try {
          // Write to temporary file
          await writeFile(tempPath, data);
          this.log(`Wrote ${data.length} bytes to temporary file: ${tempPath}`);

          // Verify write if enabled
          let verified = false;
          if (effectiveOptions.verifyWrite) {
            await this.verifyFileWrite(tempPath, data);
            verified = true;
          }

          // Atomic rename to final destination
          await rename(tempPath, filePath);
          this.log(`Atomically moved ${tempPath} to ${filePath}`);

          // Clean up backup if write was successful and cleanup is enabled
          if (backupPath && existsSync(backupPath) && effectiveOptions.cleanupBackup) {
            await unlink(backupPath).catch(() => {}); // Ignore cleanup errors
          }

          return {
            success: true,
            bytesWritten: data.length,
            duration: Date.now() - startTime,
            retryCount,
            backupPath,
            verified: effectiveOptions.verifyWrite ? verified : undefined
          };

        } catch (error) {
          // Clean up temporary file on error
          if (existsSync(tempPath)) {
            await unlink(tempPath).catch(() => {});
          }
          throw error;
        }

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.log(`Write attempt ${retryCount} failed: ${errorMessage}`);

        if (retryCount > this.options.maxRetries) {
          // Restore backup if all retries failed
          if (backupPath && existsSync(backupPath)) {
            try {
              await rename(backupPath, filePath);
              this.log(`Restored backup from ${backupPath}`);
            } catch (restoreError) {
              this.log(`Failed to restore backup: ${restoreError}`);
            }
          }

          return {
            success: false,
            bytesWritten: 0,
            duration: Date.now() - startTime,
            retryCount: retryCount - 1,
            error: errorMessage,
            backupPath
          };
        }

        // Wait before retry
        if (effectiveOptions.retryDelay > 0) {
          await this.sleep(effectiveOptions.retryDelay * retryCount);
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      bytesWritten: 0,
      duration: Date.now() - startTime,
      retryCount,
      error: 'Unexpected error'
    };
  }

  /**
   * Atomically delete a file with backup option
   */
  async deleteFile(filePath: string): Promise<AtomicWriteResult> {
    const startTime = Date.now();
    let backupPath: string | undefined;

    try {
      if (!existsSync(filePath)) {
        return {
          success: true,
          bytesWritten: 0,
          duration: Date.now() - startTime,
          retryCount: 0
        };
      }

      // Create backup if enabled
      if (this.options.createBackup) {
        backupPath = await this.createBackup(filePath);
      }

      // Delete the file
      await unlink(filePath);
      this.log(`Deleted file: ${filePath}`);

      return {
        success: true,
        bytesWritten: 0,
        duration: Date.now() - startTime,
        retryCount: 0,
        backupPath
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Delete failed: ${errorMessage}`);

      return {
        success: false,
        bytesWritten: 0,
        duration: Date.now() - startTime,
        retryCount: 0,
        error: errorMessage,
        backupPath
      };
    }
  }

  /**
   * Create a backup of an existing file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    const backupPath = `${filePath}.backup.${timestamp}.${random}`;

    const data = await readFile(filePath);
    await writeFile(backupPath, data);
    this.log(`Created backup: ${backupPath}`);

    return backupPath;
  }

  /**
   * Generate a unique temporary file path
   */
  private generateTempPath(filePath: string): string {
    const random = randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `${filePath}.tmp.${timestamp}.${random}`;
  }

  /**
   * Verify that the written data matches what was intended
   */
  private async verifyFileWrite(filePath: string, expectedData: string | Buffer): Promise<void> {
    const actualData = await readFile(filePath);
    
    const expected = Buffer.isBuffer(expectedData) ? expectedData : Buffer.from(expectedData);
    
    if (!actualData.equals(expected)) {
      throw new Error(`Write verification failed: data mismatch in ${filePath}`);
    }
    
    this.log(`Write verification passed for ${filePath}`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if (error instanceof Error && !error.message.includes('EEXIST')) {
        throw error;
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[AtomicFileOps] ${message}`);
    }
  }

  /**
   * Get file statistics safely
   */
  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const stats = await stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if file exists safely
   */
  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }
}

// Default atomic operations instance
let defaultAtomicOps: AtomicFileOperations | null = null;

export function getAtomicFileOperations(): AtomicFileOperations {
  if (!defaultAtomicOps) {
    defaultAtomicOps = new AtomicFileOperations({
      createBackup: true,
      verifyWrite: true,
      maxRetries: 3,
      retryDelay: 100,
      enableLogging: process.env.NODE_ENV === 'development'
    });
  }
  return defaultAtomicOps;
}