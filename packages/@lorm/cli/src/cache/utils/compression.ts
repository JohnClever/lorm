/**
 * Compression Utilities
 * 
 * This module provides compression and decompression utilities for cache layers,
 * supporting multiple algorithms with fallback mechanisms.
 */

import { gzip, gunzip, deflate, inflate } from 'node:zlib';
import { promisify } from 'node:util';
import type { CompressionAlgorithm } from '../core/types.js';

// Promisified compression functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

/**
 * Compression configuration
 */
interface CompressionConfig {
  level: number; // 1-9, higher = better compression but slower
  chunkSize: number;
  windowBits: number;
  memLevel: number;
}

/**
 * Compression utilities class
 */
export class CompressionUtils {
  private readonly config: CompressionConfig;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      level: 6, // Balanced compression level
      chunkSize: 16 * 1024, // 16KB chunks
      windowBits: 15,
      memLevel: 8,
      ...config
    };
  }

  /**
   * Compress data using the specified algorithm
   */
  async compress(data: unknown, algorithm: CompressionAlgorithm): Promise<Buffer> {
    try {
      // Serialize data to buffer
      const buffer = this._serializeToBuffer(data);
      
      // Apply compression
      switch (algorithm) {
        case 'gzip':
          return await gzipAsync(buffer, {
            level: this.config.level,
            chunkSize: this.config.chunkSize,
            windowBits: this.config.windowBits,
            memLevel: this.config.memLevel
          });
          
        case 'deflate':
          return await deflateAsync(buffer, {
            level: this.config.level,
            chunkSize: this.config.chunkSize,
            windowBits: this.config.windowBits,
            memLevel: this.config.memLevel
          });
          
        case 'none':
          return buffer;
          
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }
    } catch (error) {
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decompress data using the specified algorithm
   */
  async decompress(buffer: Buffer, algorithm: CompressionAlgorithm): Promise<unknown> {
    try {
      let decompressedBuffer: Buffer;
      
      // Apply decompression
      switch (algorithm) {
        case 'gzip':
          decompressedBuffer = await gunzipAsync(buffer);
          break;
          
        case 'deflate':
          decompressedBuffer = await inflateAsync(buffer);
          break;
          
        case 'none':
          decompressedBuffer = buffer;
          break;
          
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }
      
      // Deserialize from buffer
      return this._deserializeFromBuffer(decompressedBuffer);
    } catch (error) {
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate compression ratio
   */
  calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) {
      return 0;
    }
    return (originalSize - compressedSize) / originalSize;
  }

  /**
   * Estimate compression benefit
   */
  async estimateCompressionBenefit(
    data: unknown,
    algorithm: CompressionAlgorithm
  ): Promise<{ originalSize: number; compressedSize: number; ratio: number; worthwhile: boolean }> {
    const originalBuffer = this._serializeToBuffer(data);
    const originalSize = originalBuffer.length;
    
    if (algorithm === 'none') {
      return {
        originalSize,
        compressedSize: originalSize,
        ratio: 0,
        worthwhile: false
      };
    }
    
    try {
      const compressedBuffer = await this.compress(data, algorithm);
      const compressedSize = compressedBuffer.length;
      const ratio = this.calculateCompressionRatio(originalSize, compressedSize);
      
      // Consider compression worthwhile if it saves at least 10% and 100 bytes
      const worthwhile = ratio > 0.1 && (originalSize - compressedSize) > 100;
      
      return {
        originalSize,
        compressedSize,
        ratio,
        worthwhile
      };
    } catch (error) {
      return {
        originalSize,
        compressedSize: originalSize,
        ratio: 0,
        worthwhile: false
      };
    }
  }

  /**
   * Get optimal compression algorithm for data
   */
  async getOptimalAlgorithm(
    data: unknown,
    algorithms: CompressionAlgorithm[] = ['gzip', 'deflate', 'none']
  ): Promise<{ algorithm: CompressionAlgorithm; ratio: number; size: number }> {
    const results = await Promise.all(
      algorithms.map(async (algorithm) => {
        const estimate = await this.estimateCompressionBenefit(data, algorithm);
        return {
          algorithm,
          ratio: estimate.ratio,
          size: estimate.compressedSize
        };
      })
    );
    
    // Sort by compression ratio (best first)
    results.sort((a, b) => b.ratio - a.ratio);
    
    return results[0];
  }

  /**
   * Validate compressed data integrity
   */
  async validateIntegrity(
    originalData: unknown,
    compressedBuffer: Buffer,
    algorithm: CompressionAlgorithm
  ): Promise<boolean> {
    try {
      const decompressedData = await this.decompress(compressedBuffer, algorithm);
      
      // Deep comparison
      return this._deepEqual(originalData, decompressedData);
    } catch {
      return false;
    }
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): {
    supportedAlgorithms: CompressionAlgorithm[];
    defaultLevel: number;
    chunkSize: number;
  } {
    return {
      supportedAlgorithms: ['gzip', 'deflate', 'none'],
      defaultLevel: this.config.level,
      chunkSize: this.config.chunkSize
    };
  }

  // Private helper methods

  private _serializeToBuffer(data: unknown): Buffer {
    try {
      if (Buffer.isBuffer(data)) {
        return data;
      }
      
      if (typeof data === 'string') {
        return Buffer.from(data, 'utf8');
      }
      
      // Serialize to JSON
      const jsonString = JSON.stringify(data);
      return Buffer.from(jsonString, 'utf8');
    } catch (error) {
      throw new Error(`Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _deserializeFromBuffer(buffer: Buffer): unknown {
    try {
      const string = buffer.toString('utf8');
      
      // Try to parse as JSON
      try {
        return JSON.parse(string);
      } catch {
        // If JSON parsing fails, return as string
        return string;
      }
    } catch (error) {
      throw new Error(`Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    
    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b;
    }
    
    if (typeof a !== typeof b) {
      return false;
    }
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
      }
      
      if (Array.isArray(a)) {
        const arrA = a as unknown[];
        const arrB = b as unknown[];
        
        if (arrA.length !== arrB.length) {
          return false;
        }
        
        for (let i = 0; i < arrA.length; i++) {
          if (!this._deepEqual(arrA[i], arrB[i])) {
            return false;
          }
        }
        
        return true;
      }
      
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      
      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);
      
      if (keysA.length !== keysB.length) {
        return false;
      }
      
      for (const key of keysA) {
        if (!keysB.includes(key)) {
          return false;
        }
        
        if (!this._deepEqual(objA[key], objB[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }
}

/**
 * Default compression utilities instance
 */
export const compressionUtils = new CompressionUtils();

/**
 * Compression utility functions
 */
export const compression = {
  /**
   * Quick compress with default settings
   */
  async compress(data: unknown, algorithm: CompressionAlgorithm = 'gzip'): Promise<Buffer> {
    return compressionUtils.compress(data, algorithm);
  },

  /**
   * Quick decompress with default settings
   */
  async decompress(buffer: Buffer, algorithm: CompressionAlgorithm = 'gzip'): Promise<unknown> {
    return compressionUtils.decompress(buffer, algorithm);
  },

  /**
   * Check if compression is beneficial
   */
  async shouldCompress(
    data: unknown,
    threshold: number = 1024,
    algorithm: CompressionAlgorithm = 'gzip'
  ): Promise<boolean> {
    const estimate = await compressionUtils.estimateCompressionBenefit(data, algorithm);
    return estimate.originalSize >= threshold && estimate.worthwhile;
  }
};