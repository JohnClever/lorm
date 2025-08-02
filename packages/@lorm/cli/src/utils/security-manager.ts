import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SecurityConfig } from './config-schema';
import { AuditLogEntry, SecurityContext } from '../types.js';

export type { AuditLogEntry, SecurityContext };
export class SecurityManager {
  private config: SecurityConfig;
  private auditLogPath: string;
  private sessionId: string;
  private encryptionKey?: Buffer;
  constructor(config: SecurityConfig) {
    this.config = config;
    this.auditLogPath = path.resolve(config.auditLogPath);
    this.sessionId = this.generateSessionId();
    if (config.encryptionKey) {
      this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
    }
    this.ensureAuditLogDirectory();
  }
  validateCommand(command: string, context: SecurityContext): boolean {
    if (!this.config.commandSandbox) {
      return true;
    }
    if (context.allowedCommands && context.allowedCommands.length > 0) {
      return context.allowedCommands.includes(command);
    }
    const defaultAllowedCommands = [
      'help', 'init', 'dev', 'build', 'check', 'migrate', 'generate',
      'cache', 'audit', 'config', 'schema', 'db' // 'plugin' moved to @lorm/core
    ];
    return defaultAllowedCommands.includes(command);
  }
  async executeSecurely<T>(
    command: string,
    args: string[],
    executor: () => Promise<T>,
    context: SecurityContext
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let result: T;
    try {
      if (!this.validateCommand(command, context)) {
        throw new Error(`Command '${command}' is not allowed in sandbox mode`);
      }
      result = await executor();
      success = true;
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      if (this.config.enableAuditLog) {
        const duration = Date.now() - startTime;
        await this.logAuditEntry({
          timestamp: new Date().toISOString(),
          command,
          args,
          user: context.user,
          workingDirectory: context.workingDirectory,
          success,
          duration,
          errorMessage,
          sessionId: context.sessionId
        });
      }
    }
  }
  private async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      const encryptedLine = this.encryptionKey ? this.encrypt(logLine) : logLine;
      await fs.promises.appendFile(this.auditLogPath, encryptedLine, 'utf8');
    } catch (error) {
      console.warn('Failed to write audit log:', error);
    }
  }
  async getAuditLog(limit?: number): Promise<AuditLogEntry[]> {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return [];
      }
      const content = await fs.promises.readFile(this.auditLogPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const entries = lines.map(line => {
        const decryptedLine = this.encryptionKey ? this.decrypt(line) : line;
        return JSON.parse(decryptedLine) as AuditLogEntry;
      });
      const sortedEntries = entries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return limit ? sortedEntries.slice(0, limit) : sortedEntries;
    } catch (error) {
      console.warn('Failed to read audit log:', error);
      return [];
    }
  }
  async clearAuditLog(): Promise<void> {
    try {
      if (fs.existsSync(this.auditLogPath)) {
        await fs.promises.unlink(this.auditLogPath);
      }
    } catch (error) {
      console.warn('Failed to clear audit log:', error);
    }
  }
  async getAuditStats(): Promise<{
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    uniqueUsers: number;
    commandFrequency: Record<string, number>;
    lastActivity: string | null;
  }> {
    const entries = await this.getAuditLog();
    const stats = {
      totalCommands: entries.length,
      successfulCommands: entries.filter(e => e.success).length,
      failedCommands: entries.filter(e => !e.success).length,
      uniqueUsers: new Set(entries.map(e => e.user)).size,
      commandFrequency: {} as Record<string, number>,
      lastActivity: entries.length > 0 ? entries[0].timestamp : null
    };
    entries.forEach(entry => {
      stats.commandFrequency[entry.command] = 
        (stats.commandFrequency[entry.command] || 0) + 1;
    });
    return stats;
  }
  createSecurityContext(overrides?: Partial<SecurityContext>): SecurityContext {
    return {
      sessionId: this.sessionId,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      workingDirectory: process.cwd(),
      allowedCommands: this.config.allowedCommands,
      sandboxEnabled: this.config.commandSandbox,
      ...overrides
    };
  }
  isSessionValid(sessionStartTime: number): boolean {
    const currentTime = Date.now();
    const sessionAge = (currentTime - sessionStartTime) / 1000;
    return sessionAge < this.config.sessionTimeout;
  }
  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  private ensureAuditLogDirectory(): void {
    const dir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      return text;
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      return encryptedText;
    }
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      return encryptedText;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
export class SecurityUtils {
  static sanitizeArgs(args: string[]): string[] {
    return args.map(arg => {
      return arg.replace(/[;&|`$(){}\[\]<>]/g, '');
    });
  }
  static validatePath(filePath: string, allowedBasePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedBasePath = path.resolve(allowedBasePath);
    return resolvedPath.startsWith(resolvedBasePath);
  }
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  static hashData(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    return actualSalt + ':' + hash.toString('hex');
  }
  static verifyHash(data: string, hashedData: string): boolean {
    const parts = hashedData.split(':');
    if (parts.length !== 2) {
      return false;
    }
    const [salt, hash] = parts;
    const newHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return hash === newHash.toString('hex');
  }
}