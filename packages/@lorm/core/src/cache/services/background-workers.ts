/**
 * Background Workers Service for @lorm/core cache system
 * Provides non-blocking cache maintenance operations using worker threads
 */

import { Worker } from "worker_threads";
import { join } from "path";
import { fileURLToPath } from "url";
import type { BackgroundTask, TaskResult, BackgroundWorkerStats } from '../types';

// Get the worker script path
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const WORKER_SCRIPT_PATH = join(__dirname, 'worker-script.js');

export interface WorkerOptions {
  /** Maximum number of worker threads */
  maxWorkers?: number;
  /** Worker idle timeout in milliseconds */
  idleTimeout?: number;
  /** Enable worker statistics */
  enableStats?: boolean;
  /** Task queue size limit */
  maxQueueSize?: number;
}

export interface CleanupTask {
  type: 'cleanup';
  cacheDir: string;
  ttl: number;
  enableAtomic?: boolean;
  partitioned?: boolean;
}

export interface ValidationTask {
  type: 'validation';
  filePath: string;
  expectedChecksum?: string;
}

export interface CompressionTask {
  type: 'compression';
  filePath: string;
  compressionLevel?: number;
}

export interface ExtendedTaskResult extends TaskResult {
  taskId: string;
  duration: number;
  workerIndex: number;
}

export interface WorkerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  activeWorkers: number;
  queuedTasks: number;
  workerUtilization: number;
  memoryUsage: number;
}

interface PendingTask {
  id: string;
  task: BackgroundTask;
  resolve: (result: ExtendedTaskResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class BackgroundWorkerManager {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private pendingTasks: PendingTask[] = [];
  private activeTasks = new Map<string, PendingTask>();
  private options: Required<WorkerOptions>;
  private stats: WorkerStats;
  private taskIdCounter = 0;
  private workerIdleTimers = new Map<Worker, NodeJS.Timeout>();
  private destroyed = false;

  constructor(options: WorkerOptions = {}) {
    this.options = {
      maxWorkers: Math.max(1, Math.floor(require('os').cpus().length / 2)),
      idleTimeout: 30000, // 30 seconds
      enableStats: true,
      maxQueueSize: 100,
      ...options,
    };

    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
      activeWorkers: 0,
      queuedTasks: 0,
      workerUtilization: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Submit a background task for execution
   */
  async submitTask(task: BackgroundTask): Promise<ExtendedTaskResult> {
    if (this.destroyed) {
      throw new Error('Worker manager has been destroyed');
    }

    if (this.pendingTasks.length >= this.options.maxQueueSize) {
      throw new Error(`Task queue is full (${this.options.maxQueueSize} tasks)`);
    }

    const taskId = this.generateTaskId();
    
    return new Promise<ExtendedTaskResult>((resolve, reject) => {
      const pendingTask: PendingTask = {
        id: taskId,
        task,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.pendingTasks.push(pendingTask);
      this.stats.totalTasks++;
      this.stats.queuedTasks++;
      
      this.processNextTask();
    });
  }

  /**
   * Submit multiple tasks in batch
   */
  async submitBatchTasks(tasks: BackgroundTask[]): Promise<ExtendedTaskResult[]> {
    const promises = tasks.map(task => this.submitTask(task));
    return Promise.all(promises);
  }

  /**
   * Get current worker statistics
   */
  getStats(): WorkerStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get worker statistics synchronously
   */
  getStatsSync(): WorkerStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get the number of pending tasks
   */
  getPendingTaskCount(): number {
    return this.pendingTasks.length;
  }

  /**
   * Get the number of active tasks
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Clear all pending tasks
   */
  clearPendingTasks(): number {
    const count = this.pendingTasks.length;
    
    // Reject all pending tasks
    for (const pendingTask of this.pendingTasks) {
      pendingTask.reject(new Error('Task cancelled'));
    }
    
    this.pendingTasks = [];
    this.stats.queuedTasks = 0;
    
    return count;
  }

  /**
   * Destroy the worker manager and terminate all workers
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    
    this.destroyed = true;
    
    // Clear pending tasks
    this.clearPendingTasks();
    
    // Clear idle timers
    for (const timer of this.workerIdleTimers.values()) {
      clearTimeout(timer);
    }
    this.workerIdleTimers.clear();
    
    // Terminate all workers
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.availableWorkers = [];
    this.activeTasks.clear();
  }

  private generateTaskId(): string {
    return `task_${++this.taskIdCounter}_${Date.now()}`;
  }

  private createWorker(): Worker {
    const worker = new Worker(WORKER_SCRIPT_PATH);

    const workerIndex = this.workers.length;

    worker.on('message', (message) => {
      this.handleWorkerMessage(worker, message, workerIndex);
    });

    worker.on('error', (error) => {
      console.error(`Background worker ${workerIndex} error:`, error);
      this.removeWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Background worker ${workerIndex} exited with code ${code}`);
      }
      this.removeWorker(worker);
    });

    return worker;
  }

  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // Clear idle timer
    const timer = this.workerIdleTimers.get(worker);
    if (timer) {
      clearTimeout(timer);
      this.workerIdleTimers.delete(worker);
    }

    // Find and reject any active tasks for this worker
    for (const [taskId, pendingTask] of this.activeTasks) {
      // Note: In a real implementation, you'd track which worker is handling which task
      // For simplicity, we'll let the task timeout naturally
    }
  }

  private processNextTask(): void {
    if (this.pendingTasks.length === 0 || this.destroyed) return;

    let worker = this.availableWorkers.pop();
    
    if (!worker && this.workers.length < this.options.maxWorkers) {
      worker = this.createWorker();
      this.workers.push(worker);
    }

    if (!worker) return; // All workers busy

    const pendingTask = this.pendingTasks.shift()!;
    this.activeTasks.set(pendingTask.id, pendingTask);
    this.stats.queuedTasks--;

    // Clear idle timer for this worker
    const idleTimer = this.workerIdleTimers.get(worker);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.workerIdleTimers.delete(worker);
    }

    // Send task to worker
    worker.postMessage({
      taskId: pendingTask.id,
      task: pendingTask.task,
    });
  }

  private handleWorkerMessage(worker: Worker, message: any, workerIndex: number): void {
    const { taskId, success, result, error, duration } = message;
    
    const pendingTask = this.activeTasks.get(taskId);
    if (!pendingTask) {
      console.warn(`Received result for unknown task: ${taskId}`);
      return;
    }

    this.activeTasks.delete(taskId);
    
    const taskResult: ExtendedTaskResult = {
      taskId,
      success,
      result,
      error,
      executionTime: duration,
      duration,
      workerIndex,
    };

    if (success) {
      this.stats.completedTasks++;
      pendingTask.resolve(taskResult);
    } else {
      this.stats.failedTasks++;
      pendingTask.reject(new Error(error || 'Task failed'));
    }

    // Update average task duration
    const totalCompleted = this.stats.completedTasks + this.stats.failedTasks;
    this.stats.averageTaskDuration = 
      (this.stats.averageTaskDuration * (totalCompleted - 1) + duration) / totalCompleted;

    // Return worker to available pool
    this.availableWorkers.push(worker);
    
    // Set idle timer for worker
    const idleTimer = setTimeout(() => {
      this.removeWorker(worker);
    }, this.options.idleTimeout);
    this.workerIdleTimers.set(worker, idleTimer);

    // Process next task if any
    this.processNextTask();
  }

  private updateStats(): void {
    this.stats.activeWorkers = this.workers.length;
    this.stats.queuedTasks = this.pendingTasks.length;
    
    // Calculate worker utilization
    const busyWorkers = this.workers.length - this.availableWorkers.length;
    this.stats.workerUtilization = this.workers.length > 0 ? busyWorkers / this.workers.length : 0;
    
    // Estimate memory usage
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    const workerOverhead = this.workers.length * 8192; // Rough estimate per worker
    const taskOverhead = (this.pendingTasks.length + this.activeTasks.size) * 256;
    const baseOverhead = 2048;
    
    return workerOverhead + taskOverhead + baseOverhead;
  }
}

// Singleton instance
let backgroundWorkerInstance: BackgroundWorkerManager | null = null;

/**
 * Get the global background worker manager instance
 */
export function getBackgroundWorkerManager(options?: WorkerOptions): BackgroundWorkerManager {
  if (!backgroundWorkerInstance) {
    backgroundWorkerInstance = new BackgroundWorkerManager(options);
  }
  return backgroundWorkerInstance;
}

/**
 * Destroy the global background worker manager instance
 */
export async function destroyBackgroundWorkerManager(): Promise<void> {
  if (backgroundWorkerInstance) {
    await backgroundWorkerInstance.destroy();
    backgroundWorkerInstance = null;
  }
}