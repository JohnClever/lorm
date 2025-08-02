/**
 * Worker script for background cache operations
 * Handles cleanup, validation, and compression tasks in separate threads
 */

import { parentPort, workerData } from 'worker_threads';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { BackgroundTask, TaskResult } from '../types';

if (!parentPort) {
  throw new Error('Worker script must be run in a worker thread');
}

/**
 * Execute cleanup task
 */
async function executeCleanupTask(task: BackgroundTask): Promise<any> {
  const { cacheDir, ttl, enableAtomic, partitioned } = task;
  
  if (!cacheDir || !ttl) {
    throw new Error('Cleanup task requires cacheDir and ttl');
  }

  let cleanedCount = 0;
  const now = Date.now();

  if (!existsSync(cacheDir)) {
    return { cleanedCount: 0 };
  }

  if (partitioned) {
    // Handle partitioned cleanup
    const partitionDirs = await readdir(cacheDir);
    
    for (const partitionDir of partitionDirs) {
      const fullPartitionPath = join(cacheDir, partitionDir);
      
      try {
        const partitionStat = await stat(fullPartitionPath);
        if (partitionStat.isDirectory()) {
          const files = await readdir(fullPartitionPath);
          
          for (const file of files) {
            const filePath = join(fullPartitionPath, file);
            try {
              const fileStat = await stat(filePath);
              const fileAge = now - fileStat.mtime.getTime();
              
              if (fileAge > ttl) {
                await unlink(filePath);
                cleanedCount++;
              }
            } catch {
              // Ignore individual file errors
            }
          }
        }
      } catch {
        // Ignore partition directory errors
      }
    }
  } else {
    // Handle regular cleanup
    const files = await readdir(cacheDir);
    
    for (const file of files) {
      const filePath = join(cacheDir, file);
      try {
        const fileStat = await stat(filePath);
        const fileAge = now - fileStat.mtime.getTime();
        
        if (fileAge > ttl) {
          await unlink(filePath);
          cleanedCount++;
        }
      } catch {
        // Ignore individual file errors
      }
    }
  }

  return { cleanedCount };
}

/**
 * Execute validation task
 */
async function executeValidationTask(task: BackgroundTask): Promise<any> {
  const { cacheDir, data } = task;
  
  if (!cacheDir) {
    throw new Error('Validation task requires cacheDir');
  }

  let validatedCount = 0;
  let corruptedCount = 0;

  if (!existsSync(cacheDir)) {
    return { validatedCount: 0, corruptedCount: 0 };
  }

  const files = await readdir(cacheDir);
  
  for (const file of files) {
    const filePath = join(cacheDir, file);
    try {
      const fileStat = await stat(filePath);
      
      if (fileStat.isFile()) {
        // Basic validation - check if file is readable and has content
        if (fileStat.size > 0) {
          validatedCount++;
        } else {
          corruptedCount++;
          // Optionally remove empty files
          if (data?.removeCorrupted) {
            await unlink(filePath);
          }
        }
      }
    } catch {
      corruptedCount++;
    }
  }

  return { validatedCount, corruptedCount };
}

/**
 * Execute compression task
 */
async function executeCompressionTask(task: BackgroundTask): Promise<any> {
  const { data } = task;
  
  if (!data?.inputData) {
    throw new Error('Compression task requires input data');
  }

  // This is a placeholder for compression logic
  // In a real implementation, you would use a compression library
  const inputSize = Buffer.byteLength(JSON.stringify(data.inputData));
  const compressionRatio = 0.7; // Simulated compression ratio
  const compressedSize = Math.floor(inputSize * compressionRatio);

  return {
    originalSize: inputSize,
    compressedSize,
    compressionRatio: compressedSize / inputSize,
    compressed: true
  };
}

/**
 * Main worker execution function
 */
async function executeTask(task: BackgroundTask): Promise<TaskResult> {
  const startTime = Date.now();
  
  try {
    let result: any;
    
    switch (task.type) {
      case 'cleanup':
        result = await executeCleanupTask(task);
        break;
      case 'validation':
        result = await executeValidationTask(task);
        break;
      case 'compression':
        result = await executeCompressionTask(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      result,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    };
  }
}

// Listen for tasks from the main thread
parentPort.on('message', async (task: BackgroundTask) => {
  try {
    const result = await executeTask(task);
    parentPort!.postMessage(result);
  } catch (error) {
    parentPort!.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Worker execution failed',
      executionTime: 0
    });
  }
});

// Handle worker termination
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});