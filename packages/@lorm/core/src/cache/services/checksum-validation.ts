/**
 * Checksum Validation Service
 * Provides data integrity validation for cache entries using multiple hash algorithms
 */

import { createHash, createHmac } from "crypto";
import { readFile } from "fs/promises";

export type HashAlgorithm = 'sha256' | 'sha512' | 'md5' | 'sha1';

export interface ChecksumOptions {
  /** Primary hash algorithm */
  algorithm: HashAlgorithm;
  /** Secondary hash algorithm for double verification */
  secondaryAlgorithm?: HashAlgorithm;
  /** Secret key for HMAC (optional) */
  secretKey?: string;
  /** Include metadata in checksum calculation */
  includeMetadata: boolean;
  /** Enable detailed logging */
  enableLogging: boolean;
}

export interface ChecksumResult {
  /** Primary checksum */
  primary: string;
  /** Secondary checksum (if enabled) */
  secondary?: string;
  /** HMAC checksum (if secret key provided) */
  hmac?: string;
  /** Algorithm used */
  algorithm: HashAlgorithm;
  /** Timestamp when checksum was calculated */
  timestamp: number;
  /** Data size in bytes */
  dataSize: number;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation details */
  details: {
    primaryMatch: boolean;
    secondaryMatch?: boolean;
    hmacMatch?: boolean;
    sizeMatch: boolean;
  };
  /** Error message if validation failed */
  error?: string;
  /** Array of specific error messages */
  errors?: string[];
  /** Validation duration in milliseconds */
  duration: number;
}

export interface CacheEntryWithChecksum<T = unknown> {
  /** The cached data */
  data: T;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Hash of the cache key for validation */
  hash: string;
  /** Size of the entry in bytes */
  size: number;
  /** Whether the entry is compressed */
  compressed?: boolean;
  /** Number of times this entry has been accessed */
  accessCount?: number;
  /** Timestamp of last access */
  lastAccessed?: number;
  /** TTL override for this specific entry */
  ttl?: number;
  /** Checksum information for data integrity */
  checksum: ChecksumResult;
}

export class ChecksumValidator {
  private options: ChecksumOptions;

  constructor(options: Partial<ChecksumOptions> = {}) {
    this.options = {
      algorithm: 'sha256',
      includeMetadata: true,
      enableLogging: process.env.NODE_ENV === 'development',
      ...options
    };
  }

  /**
   * Calculate checksum for cache entry data
   */
  calculateChecksum(data: unknown, metadata?: Record<string, unknown>): ChecksumResult {
    const startTime = Date.now();
    
    // Serialize data for hashing
    const serializedData = this.serializeData(data);
    const dataBuffer = Buffer.from(serializedData, 'utf8');
    
    // Include metadata if enabled
    let hashInput = dataBuffer;
    if (this.options.includeMetadata && metadata) {
      const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
      hashInput = Buffer.concat([dataBuffer, metadataBuffer]);
    }

    // Calculate primary checksum
    const primary = createHash(this.options.algorithm)
      .update(hashInput)
      .digest('hex');

    const result: ChecksumResult = {
      primary,
      algorithm: this.options.algorithm,
      timestamp: Date.now(),
      dataSize: dataBuffer.length
    };

    // Calculate secondary checksum if enabled
    if (this.options.secondaryAlgorithm) {
      result.secondary = createHash(this.options.secondaryAlgorithm)
        .update(hashInput)
        .digest('hex');
    }

    // Calculate HMAC if secret key provided
    if (this.options.secretKey) {
      result.hmac = createHmac(this.options.algorithm, this.options.secretKey)
        .update(hashInput)
        .digest('hex');
    }

    this.log(`Calculated checksum in ${Date.now() - startTime}ms: ${primary.substring(0, 16)}...`);
    return result;
  }

  /**
   * Validate data against a checksum
   */
  validateData(data: unknown, expectedChecksum: ChecksumResult, metadata?: Record<string, unknown>): ValidationResult {
    const startTime = Date.now();
    
    try {
      const currentChecksum = this.calculateChecksum(data, metadata);
      
      // Compare checksums
      const primaryMatch = currentChecksum.primary === expectedChecksum.primary;
      const secondaryMatch = expectedChecksum.secondary 
        ? currentChecksum.secondary === expectedChecksum.secondary
        : undefined;
      const hmacMatch = expectedChecksum.hmac
        ? currentChecksum.hmac === expectedChecksum.hmac
        : undefined;
      const sizeMatch = currentChecksum.dataSize === expectedChecksum.dataSize;

      const isValid = primaryMatch && 
        (secondaryMatch === undefined || secondaryMatch) &&
        (hmacMatch === undefined || hmacMatch) &&
        sizeMatch;

      const result: ValidationResult = {
        isValid,
        details: {
          primaryMatch,
          secondaryMatch,
          hmacMatch,
          sizeMatch
        },
        duration: Date.now() - startTime
      };

      const failures = [];
      if (!primaryMatch) failures.push('Primary checksum mismatch');
      if (secondaryMatch === false) failures.push('Secondary checksum mismatch');
      if (hmacMatch === false) failures.push('HMAC mismatch');
      if (!sizeMatch) failures.push('Size mismatch');
      
      result.errors = failures;
      
      if (!isValid) {
        this.log(`Validation failed: ${failures.join(', ')}`);
      } else {
        this.log(`Validation passed in ${result.duration}ms`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Validation error: ${errorMessage}`);
      
      return {
        isValid: false,
        details: {
          primaryMatch: false,
          sizeMatch: false
        },
        error: `Validation error: ${errorMessage}`,
        errors: [],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate cache entry against its checksum
   */
  validateEntry<T>(entry: CacheEntryWithChecksum<T>): ValidationResult {
    const startTime = Date.now();
    
    try {
      // Recalculate checksum for current data
      const metadata = this.options.includeMetadata ? {
        timestamp: entry.timestamp,
        hash: entry.hash,
        size: entry.size,
        compressed: entry.compressed,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        ttl: entry.ttl
      } : undefined;

      const currentChecksum = this.calculateChecksum(entry.data, metadata);
      
      // Compare checksums
      const primaryMatch = currentChecksum.primary === entry.checksum.primary;
      const secondaryMatch = entry.checksum.secondary 
        ? currentChecksum.secondary === entry.checksum.secondary
        : undefined;
      const hmacMatch = entry.checksum.hmac
        ? currentChecksum.hmac === entry.checksum.hmac
        : undefined;
      const sizeMatch = currentChecksum.dataSize === entry.checksum.dataSize;

      const isValid = primaryMatch && 
        (secondaryMatch === undefined || secondaryMatch) &&
        (hmacMatch === undefined || hmacMatch) &&
        sizeMatch;

      const result: ValidationResult = {
        isValid,
        details: {
          primaryMatch,
          secondaryMatch,
          hmacMatch,
          sizeMatch
        },
        duration: Date.now() - startTime
      };

      if (!isValid) {
        const failures = [];
        if (!primaryMatch) failures.push('primary checksum mismatch');
        if (secondaryMatch === false) failures.push('secondary checksum mismatch');
        if (hmacMatch === false) failures.push('HMAC mismatch');
        if (!sizeMatch) failures.push('size mismatch');
        
        result.error = `Data integrity validation failed: ${failures.join(', ')}`;
        this.log(`Validation failed: ${result.error}`);
      } else {
        this.log(`Validation passed in ${result.duration}ms`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Validation error: ${errorMessage}`);
      
      return {
        isValid: false,
        details: {
          primaryMatch: false,
          sizeMatch: false
        },
        error: `Validation error: ${errorMessage}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate file checksum
   */
  async validateFile(filePath: string, expectedChecksum: ChecksumResult): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const fileData = await readFile(filePath);
      const currentChecksum = this.calculateChecksumFromBuffer(fileData);
      
      const primaryMatch = currentChecksum.primary === expectedChecksum.primary;
      const secondaryMatch = expectedChecksum.secondary
        ? currentChecksum.secondary === expectedChecksum.secondary
        : undefined;
      const hmacMatch = expectedChecksum.hmac
        ? currentChecksum.hmac === expectedChecksum.hmac
        : undefined;
      const sizeMatch = currentChecksum.dataSize === expectedChecksum.dataSize;

      const isValid = primaryMatch &&
        (secondaryMatch === undefined || secondaryMatch) &&
        (hmacMatch === undefined || hmacMatch) &&
        sizeMatch;

      const result: ValidationResult = {
        isValid,
        details: {
          primaryMatch,
          secondaryMatch,
          hmacMatch,
          sizeMatch
        },
        duration: Date.now() - startTime
      };

      if (!isValid) {
        const failures = [];
        if (!primaryMatch) failures.push('primary checksum mismatch');
        if (secondaryMatch === false) failures.push('secondary checksum mismatch');
        if (hmacMatch === false) failures.push('HMAC mismatch');
        if (!sizeMatch) failures.push('size mismatch');
        
        result.error = `File integrity validation failed: ${failures.join(', ')}`;
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        isValid: false,
        details: {
          primaryMatch: false,
          sizeMatch: false
        },
        error: `File validation error: ${errorMessage}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate checksum from buffer
   */
  private calculateChecksumFromBuffer(buffer: Buffer): ChecksumResult {
    const primary = createHash(this.options.algorithm)
      .update(buffer)
      .digest('hex');

    const result: ChecksumResult = {
      primary,
      algorithm: this.options.algorithm,
      timestamp: Date.now(),
      dataSize: buffer.length
    };

    if (this.options.secondaryAlgorithm) {
      result.secondary = createHash(this.options.secondaryAlgorithm)
        .update(buffer)
        .digest('hex');
    }

    if (this.options.secretKey) {
      result.hmac = createHmac(this.options.algorithm, this.options.secretKey)
        .update(buffer)
        .digest('hex');
    }

    return result;
  }

  /**
   * Serialize data for consistent hashing
   */
  private serializeData(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }
    
    if (Buffer.isBuffer(data)) {
      return data.toString('base64');
    }
    
    // For objects, use deterministic JSON serialization
    return JSON.stringify(data, Object.keys(data as object).sort());
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[ChecksumValidator] ${message}`);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<ChecksumOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): ChecksumOptions {
    return { ...this.options };
  }
}

// Default checksum validator instance
let defaultValidator: ChecksumValidator | null = null;

export function getChecksumValidator(): ChecksumValidator {
  if (!defaultValidator) {
    defaultValidator = new ChecksumValidator({
      algorithm: 'sha256',
      secondaryAlgorithm: 'sha1',
      includeMetadata: true,
      enableLogging: process.env.NODE_ENV === 'development'
    });
  }
  return defaultValidator;
}

export function createSecureValidator(secretKey: string): ChecksumValidator {
  return new ChecksumValidator({
    algorithm: 'sha256',
    secondaryAlgorithm: 'sha512',
    secretKey,
    includeMetadata: true,
    enableLogging: process.env.NODE_ENV === 'development'
  });
}