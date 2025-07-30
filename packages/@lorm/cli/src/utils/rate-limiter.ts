import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export class RateLimiter {
  private static readonly CACHE_DIR = join(homedir(), ".lorm", "security");
  private static readonly RATE_LIMIT_FILE = join(
    RateLimiter.CACHE_DIR,
    "rate-limits.json"
  );

  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    "db:drop": {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 24 * 60 * 60 * 1000,
    },
    dangerous: {
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    },
    default: {
      maxAttempts: 100,
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000,
    },
  };

  static async checkRateLimit(
    command: string,
    identifier?: string
  ): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime?: number;
    blockUntil?: number;
  }> {
    const config = this.getConfigForCommand(command);
    const key = this.generateKey(command, identifier);
    const now = Date.now();

    try {
      await this.ensureCacheDir();
      const rateLimits = await this.loadRateLimits();
      const entry = rateLimits[key];

      if (!entry) {
        await this.updateRateLimit(key, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        });

        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
        };
      }

      if (entry.lastAttempt + config.blockDurationMs > now) {
        return {
          allowed: false,
          remainingAttempts: 0,
          blockUntil: entry.lastAttempt + config.blockDurationMs,
        };
      }

      if (entry.firstAttempt + config.windowMs < now) {
        await this.updateRateLimit(key, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        });

        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
        };
      }

      if (entry.count >= config.maxAttempts) {
        await this.updateRateLimit(key, {
          ...entry,
          lastAttempt: now,
        });

        return {
          allowed: false,
          remainingAttempts: 0,
          blockUntil: now + config.blockDurationMs,
        };
      }

      await this.updateRateLimit(key, {
        ...entry,
        count: entry.count + 1,
        lastAttempt: now,
      });

      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - entry.count - 1,
        resetTime: entry.firstAttempt + config.windowMs,
      };
    } catch (error) {
      console.warn("Rate limiting check failed:", error);
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts,
      };
    }
  }

  static displayRateLimitInfo(
    result: {
      allowed: boolean;
      remainingAttempts: number;
      resetTime?: number;
      blockUntil?: number;
    },
    command: string
  ): void {
    if (!result.allowed) {
      console.log(chalk.red("\n🚫 Rate Limit Exceeded"));
      console.log(
        chalk.yellow(`Command '${command}' has been rate limited for security.`)
      );

      if (result.blockUntil) {
        const blockDuration = Math.ceil(
          (result.blockUntil - Date.now()) / (60 * 1000)
        );
        console.log(
          chalk.yellow(
            `Please wait ${blockDuration} minutes before trying again.`
          )
        );
      }

      console.log(
        chalk.gray(
          "\n💡 This protection helps prevent accidental or malicious command abuse."
        )
      );
    } else if (result.remainingAttempts <= 2) {
      console.log(
        chalk.yellow(
          `\n⚠️  Rate Limit Warning: ${result.remainingAttempts} attempts remaining`
        )
      );

      if (result.resetTime) {
        const resetIn = Math.ceil(
          (result.resetTime - Date.now()) / (60 * 1000)
        );
        console.log(chalk.gray(`Rate limit resets in ${resetIn} minutes.`));
      }
    }
  }

  static async clearRateLimits(
    command?: string,
    identifier?: string
  ): Promise<void> {
    try {
      if (!command) {
        await fs.writeFile(this.RATE_LIMIT_FILE, JSON.stringify({}), "utf8");
        return;
      }

      const key = this.generateKey(command, identifier);
      const rateLimits = await this.loadRateLimits();
      delete rateLimits[key];
      await fs.writeFile(
        this.RATE_LIMIT_FILE,
        JSON.stringify(rateLimits, null, 2),
        "utf8"
      );
    } catch (error) {
      console.warn("Failed to clear rate limits:", error);
    }
  }

  private static getConfigForCommand(command: string): RateLimitConfig {
    if (this.DEFAULT_CONFIGS[command]) {
      return this.DEFAULT_CONFIGS[command];
    }

    const dangerousCommands = [
      "drop",
      "delete",
      "truncate",
      "reset",
      "destroy",
    ];
    if (
      dangerousCommands.some((dangerous) =>
        command.toLowerCase().includes(dangerous)
      )
    ) {
      return this.DEFAULT_CONFIGS.dangerous;
    }

    return this.DEFAULT_CONFIGS.default;
  }

  private static generateKey(command: string, identifier?: string): string {
    const base = `${command}:${identifier || "default"}`;
    return Buffer.from(base).toString("base64");
  }

  private static async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.CACHE_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private static async loadRateLimits(): Promise<
    Record<string, RateLimitEntry>
  > {
    try {
      const data = await fs.readFile(this.RATE_LIMIT_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty object
      return {};
    }
  }

  private static async updateRateLimit(
    key: string,
    entry: RateLimitEntry
  ): Promise<void> {
    const rateLimits = await this.loadRateLimits();
    rateLimits[key] = entry;
    await fs.writeFile(
      this.RATE_LIMIT_FILE,
      JSON.stringify(rateLimits, null, 2),
      "utf8"
    );
  }
}
