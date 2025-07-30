import chalk from "chalk";
import { createContext, runInContext } from "vm";
import { EventEmitter } from "events";

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  blockedModules?: string[];
  allowFileSystem?: boolean;
  allowNetwork?: boolean;
}

export interface SandboxContext {
  console: Console;
  setTimeout: (
    callback: (...args: any[]) => void,
    delay: number
  ) => NodeJS.Timeout;
  clearTimeout: typeof clearTimeout;
  setInterval: (
    callback: (...args: any[]) => void,
    delay: number
  ) => NodeJS.Timeout;
  clearInterval: typeof clearInterval;
  Buffer: typeof Buffer;
  process: {
    env: Record<string, string | undefined>;
    cwd: () => string;
    version: string;
    platform: string;
    arch: string;
  };
  require: (id: string) => any;
  exports: any;
  module: { exports: any };
  __filename: string;
  __dirname: string;
  args?: any[];
  thisArg?: any;
  [key: string]: any;
}

export class PluginSandbox extends EventEmitter {
  private context: SandboxContext;
  private options: Required<SandboxOptions>;
  private memoryUsage = 0;
  private startTime = 0;

  constructor(options: SandboxOptions = {}) {
    super();

    this.options = {
      timeout: 30000,
      memoryLimit: 50 * 1024 * 1024,
      allowedModules: ["path", "util", "crypto"],
      blockedModules: ["fs", "child_process", "cluster", "worker_threads"],
      allowFileSystem: false,
      allowNetwork: false,
      ...options,
    };

    this.context = this.createSandboxContext();
  }

  async execute<T = any>(
    code: string,
    filename: string = "plugin.js"
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.startTime = Date.now();
      const timeoutId = setTimeout(() => {
        reject(
          new Error(`Plugin execution timeout after ${this.options.timeout}ms`)
        );
      }, this.options.timeout);

      try {
        const memoryMonitor = setInterval(() => {
          this.checkMemoryUsage();
        }, 1000);

        const result = runInContext(code, createContext(this.context), {
          filename,
          timeout: this.options.timeout,
          displayErrors: true,
        });

        clearTimeout(timeoutId);
        clearInterval(memoryMonitor);

        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  async executeFunction<T = any>(
    fn: Function,
    args: any[] = [],
    thisArg?: any
  ): Promise<T> {
    const code = `
      const fn = ${fn.toString()};
      const result = fn.apply(${thisArg ? "thisArg" : "null"}, args);
      result;
    `;

    this.context.args = args;
    if (thisArg) {
      this.context.thisArg = thisArg;
    }

    try {
      return await this.execute<T>(code);
    } finally {
      delete this.context.args;
      delete this.context.thisArg;
    }
  }

  getStats(): {
    executionTime: number;
    memoryUsage: number;
    contextSize: number;
  } {
    return {
      executionTime: this.startTime ? Date.now() - this.startTime : 0,
      memoryUsage: this.memoryUsage,
      contextSize: Object.keys(this.context).length,
    };
  }

  reset(): void {
    this.context = this.createSandboxContext();
    this.memoryUsage = 0;
    this.startTime = 0;
  }

  private createSandboxContext(): SandboxContext {
    const context: SandboxContext = {
      console: {
        log: (...args: any[]) => this.safeLog("log", args),
        warn: (...args: any[]) => this.safeLog("warn", args),
        error: (...args: any[]) => this.safeLog("error", args),
        info: (...args: any[]) => this.safeLog("info", args),
        debug: (...args: any[]) => this.safeLog("debug", args),
      } as Console,

      setTimeout: (callback: (...args: any[]) => void, delay: number) => {
        return setTimeout(() => {
          try {
            callback();
          } catch (error) {
            this.emit("error", error);
          }
        }, Math.min(delay, 5000));
      },
      clearTimeout,
      setInterval: (callback: (...args: any[]) => void, delay: number) => {
        return setInterval(() => {
          try {
            callback();
          } catch (error) {
            this.emit("error", error);
          }
        }, Math.max(delay, 100));
      },
      clearInterval,

      Buffer: {
        from: Buffer.from.bind(Buffer),
        alloc: (size: number) => {
          if (size > 1024 * 1024) {
            throw new Error("Buffer size limit exceeded");
          }
          return Buffer.alloc(size);
        },
        isBuffer: Buffer.isBuffer.bind(Buffer),
      } as any,

      process: {
        env: { ...process.env },
        cwd: process.cwd.bind(process),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },

      require: (id: string) => this.safeRequire(id),

      exports: {},
      module: { exports: {} },
      __filename: "plugin.js",
      __dirname: "/sandbox",
    };

    return context;
  }

  private safeLog(level: string, args: any[]): void {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");

    const truncatedMessage =
      message.length > 1000
        ? message.substring(0, 1000) + "... (truncated)"
        : message;

    this.emit("log", { level, message: truncatedMessage });

    const prefix = chalk.gray(`[Plugin ${level.toUpperCase()}]`);
    const consoleMethod = (console as any)[level];
    if (typeof consoleMethod === "function") {
      consoleMethod(prefix, truncatedMessage);
    }
  }

  private safeRequire(id: string): any {
    if (this.options.blockedModules.includes(id)) {
      throw new Error(`Module '${id}' is not allowed in sandbox`);
    }

    if (
      this.options.allowedModules.length > 0 &&
      !this.options.allowedModules.includes(id)
    ) {
      throw new Error(`Module '${id}' is not in allowed modules list`);
    }

    switch (id) {
      case "path":
        return require("path");
      case "util":
        return require("util");
      case "crypto":
        return require("crypto");
      case "events":
        return require("events");
      default:
        throw new Error(`Module '${id}' is not available in sandbox`);
    }
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.memoryUsage = usage.heapUsed;

    if (this.memoryUsage > this.options.memoryLimit) {
      throw new Error(
        `Memory limit exceeded: ${Math.round(
          this.memoryUsage / 1024 / 1024
        )}MB > ${Math.round(this.options.memoryLimit / 1024 / 1024)}MB`
      );
    }
  }
}

export function createPluginSandbox(options?: SandboxOptions): PluginSandbox {
  return new PluginSandbox(options);
}
