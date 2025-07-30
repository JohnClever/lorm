import chalk from "chalk";

export interface CommandExample {
  command: string;
  description: string;
}

export interface CommandHelp {
  name: string;
  description: string;
  usage: string;
  examples: CommandExample[];
  options?: { flag: string; description: string; default?: string }[];
  category?: string;
  relatedCommands?: string[];
}

export interface CommandCategory {
  name: string;
  description: string;
  commands: string[];
}

export const COMMAND_HELP: Record<string, CommandHelp> = {
  init: {
    name: "init",
    description: "Initialize a new Lorm project with configuration files",
    usage: "npx @lorm/cli init [options]",
    category: "Project Setup",
    relatedCommands: ["check", "dev"],
    examples: [
      {
        command: "npx @lorm/cli init",
        description: "Initialize project with interactive prompts",
      },
      {
        command: "npx @lorm/cli init --force",
        description: "Overwrite existing configuration files",
      },
      {
        command: "npx @lorm/cli init --skip-install",
        description: "Skip automatic dependency installation",
      },
    ],
    options: [
      { flag: "--force", description: "Overwrite existing files" },
      { flag: "--skip-install", description: "Skip dependency installation" },
    ],
  },
  dev: {
    name: "dev",
    description:
      "Start development server with file watching and type generation",
    usage: "npx @lorm/cli dev [options]",
    category: "Development",
    relatedCommands: ["check", "db:studio"],
    examples: [
      {
        command: "npx @lorm/cli dev",
        description: "Start dev server on default port (3000)",
      },
      {
        command: "npx @lorm/cli dev --port 8080",
        description: "Start dev server on custom port",
      },
    ],
    options: [
      {
        flag: "--port <port>",
        description: "Port to run the server on",
        default: "3000",
      },
    ],
  },
  "db:push": {
    name: "db:push",
    description: "Push schema changes directly to the database (destructive)",
    usage: "npx @lorm/cli db:push [options]",
    category: "Database",
    relatedCommands: ["db:generate", "db:migrate"],
    examples: [
      {
        command: "npx @lorm/cli db:push",
        description: "Push schema with confirmation prompt",
      },
      {
        command: "npx @lorm/cli db:push --force",
        description: "Push schema without confirmation (dangerous)",
      },
    ],
    options: [
      { flag: "--force", description: "Force push without confirmation" },
    ],
  },
  "db:generate": {
    name: "db:generate",
    description: "Generate migration files from schema changes",
    usage: "npx @lorm/cli db:generate [options]",
    category: "Database",
    relatedCommands: ["db:migrate", "db:push"],
    examples: [
      {
        command: "npx @lorm/cli db:generate",
        description: "Generate migration with auto-generated name",
      },
      {
        command: "npx @lorm/cli db:generate --name add_users_table",
        description: "Generate migration with custom name",
      },
    ],
    options: [{ flag: "--name <name>", description: "Custom migration name" }],
  },
  "db:migrate": {
    name: "db:migrate",
    description: "Apply pending database migrations",
    usage: "npx @lorm/cli db:migrate [options]",
    category: "Database",
    relatedCommands: ["db:generate", "db:studio"],
    examples: [
      {
        command: "npx @lorm/cli db:migrate",
        description: "Apply all pending migrations",
      },
      {
        command: "npx @lorm/cli db:migrate --to 20231201_add_users",
        description: "Migrate to specific migration",
      },
    ],
    options: [
      { flag: "--to <target>", description: "Migrate to specific migration" },
    ],
  },
  "db:pull": {
    name: "db:pull",
    description: "Pull and introspect schema from existing database",
    usage: "npx @lorm/cli db:pull [options]",
    category: "Database",
    relatedCommands: ["db:generate", "check"],
    examples: [
      {
        command: "npx @lorm/cli db:pull",
        description: "Pull schema to default location",
      },
      {
        command: "npx @lorm/cli db:pull --out ./schemas",
        description: "Pull schema to custom directory",
      },
    ],
    options: [
      { flag: "--out <dir>", description: "Output directory for schema files" },
    ],
  },
  "db:studio": {
    name: "db:studio",
    description: "Start Drizzle Studio for database management",
    usage: "npx @lorm/cli db:studio [options]",
    category: "Database",
    relatedCommands: ["dev", "db:migrate"],
    examples: [
      {
        command: "npx @lorm/cli db:studio",
        description: "Start studio on default port (4983)",
      },
      {
        command: "npx @lorm/cli db:studio --port 5000 --host 0.0.0.0",
        description: "Start studio on custom port and host",
      },
    ],
    options: [
      {
        flag: "--port <port>",
        description: "Port for Drizzle Studio",
        default: "4983",
      },
      {
        flag: "--host <host>",
        description: "Host for Drizzle Studio",
        default: "localhost",
      },
    ],
  },
  "db:drop": {
    name: "db:drop",
    description: "⚠️  Drop all tables and data (DANGER ZONE)",
    usage: "npx @lorm/cli db:drop [options]",
    category: "Database",
    relatedCommands: ["db:push", "db:migrate"],
    options: [
      {
        flag: "--force",
        description: "Skip confirmation prompts (use with extreme caution)",
      },
      {
        flag: "--confirm",
        description: "Confirm destructive operation",
      },
    ],
    examples: [
      {
        command: "npx @lorm/cli db:drop",
        description: "Drop all tables with safety confirmations",
      },
      {
        command: "npx @lorm/cli db:drop --force",
        description: "⚠️  Force drop without confirmations (DANGEROUS)",
      },
    ],
  },
  check: {
    name: "check",
    description: "Check schema consistency and validate configuration",
    usage: "npx @lorm/cli check [options]",
    category: "Validation",
    relatedCommands: ["init", "dev"],
    examples: [
      {
        command: "npx @lorm/cli check",
        description: "Basic configuration and schema check",
      },
      {
        command: "npx @lorm/cli check --verbose",
        description: "Detailed validation output",
      },
    ],
    options: [
      { flag: "--verbose", description: "Show detailed validation output" },
    ],
  },
  "security:logs": {
    name: "security:logs",
    description: "View and monitor security logs with filtering options",
    usage: "npx @lorm/cli security:logs [options]",
    category: "Security",
    relatedCommands: ["security:audit", "check"],
    examples: [
      {
        command: "npx @lorm/cli security:logs",
        description: "View recent security logs",
      },
      {
        command: "npx @lorm/cli security:logs --level error",
        description: "Show only error-level security events",
      },
      {
        command: "npx @lorm/cli security:logs --search 'db_drop'",
        description: "Search for specific security events",
      },
      {
        command: "npx @lorm/cli security:logs --json",
        description: "Output logs in JSON format",
      },
    ],
    options: [
      { flag: "--lines <number>", description: "Number of log lines to display", default: "50" },
      { flag: "--level <level>", description: "Filter by log level (info, warn, error, critical)" },
      { flag: "--follow", description: "Follow log output in real-time" },
      { flag: "--json", description: "Output in JSON format" },
      { flag: "--search <term>", description: "Search for specific terms in logs" },
    ],
  },
  "security:audit": {
    name: "security:audit",
    description: "Run comprehensive security audit and vulnerability scan",
    usage: "npx @lorm/cli security:audit [options]",
    category: "Security",
    relatedCommands: ["security:logs", "check"],
    examples: [
      {
        command: "npx @lorm/cli security:audit",
        description: "Run basic security audit",
      },
      {
        command: "npx @lorm/cli security:audit --verbose",
        description: "Run audit with detailed output",
      },
      {
        command: "npx @lorm/cli security:audit --json",
        description: "Output audit results in JSON format",
      },
      {
        command: "npx @lorm/cli security:audit --fix",
        description: "Automatically fix detected security issues",
      },
    ],
    options: [
      { flag: "--verbose", description: "Show detailed audit information" },
      { flag: "--json", description: "Output results in JSON format" },
      { flag: "--fix", description: "Automatically fix detected issues" },
      { flag: "--severity <level>", description: "Filter by severity level (low, medium, high, critical)" },
    ],
  },
};

/**
 * Display detailed help for a specific command
 */
export function displayCommandHelp(commandName: string): void {
  const help = COMMAND_HELP[commandName];

  if (!help) {
    console.error(chalk.red(`Unknown command: ${commandName}`));
    return;
  }

  console.log(chalk.bold.blue(`\n${help.name}`));
  console.log(chalk.gray(help.description));

  console.log(chalk.bold("\nUsage:"));
  console.log(`  ${chalk.cyan(help.usage)}`);

  if (help.options && help.options.length > 0) {
    console.log(chalk.bold("\nOptions:"));
    help.options.forEach((option) => {
      const defaultText = option.default
        ? chalk.gray(` (default: ${option.default})`)
        : "";
      console.log(
        `  ${chalk.yellow(option.flag.padEnd(20))} ${
          option.description
        }${defaultText}`
      );
    });
  }

  console.log(chalk.bold("\nExamples:"));
  help.examples.forEach((example) => {
    console.log(`  ${chalk.cyan(example.command)}`);
    console.log(`    ${chalk.gray(example.description)}`);
  });

  if (help.relatedCommands && help.relatedCommands.length > 0) {
    console.log(chalk.bold("\nRelated Commands:"));
    help.relatedCommands.forEach((cmd) => {
      const relatedHelp = COMMAND_HELP[cmd];
      if (relatedHelp) {
        console.log(
          `  ${chalk.cyan(cmd.padEnd(15))} ${chalk.gray(
            relatedHelp.description
          )}`
        );
      }
    });
  }

  console.log();
  console.log(chalk.gray(`💡 Run 'npx @lorm/cli help' to see all commands`));
  console.log();
}

export const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: "Project Setup",
    description: "Initialize and configure your Lorm project",
    commands: ["init"],
  },
  {
    name: "Development",
    description: "Development server and tools",
    commands: ["dev"],
  },
  {
    name: "Database",
    description: "Database schema and migration management",
    commands: [
      "db:push",
      "db:generate",
      "db:migrate",
      "db:pull",
      "db:studio",
      "db:drop",
    ],
  },
  {
    name: "Validation",
    description: "Project validation and health checks",
    commands: ["check"],
  },
  {
    name: "Security",
    description: "Security monitoring and audit tools",
    commands: ["security:logs", "security:audit"],
  },
];

export function displayGeneralHelp(): void {
  console.log(chalk.bold.blue("\n🚀 Lorm CLI - Mobile-first framework"));
  console.log(chalk.gray("Build full-stack, type-safe mobile apps fast\n"));

  console.log(chalk.bold("Usage:"));
  console.log("  npx @lorm/cli <command> [options]\n");

  console.log(chalk.bold("🚀 Quick Start:"));
  console.log(
    `  ${chalk.cyan("npx @lorm/cli init")}        ${chalk.gray(
      "Initialize a new project"
    )}`
  );
  console.log(
    `  ${chalk.cyan("npx @lorm/cli dev")}         ${chalk.gray(
      "Start development server"
    )}`
  );
  console.log(
    `  ${chalk.cyan("npx @lorm/cli db:push")}     ${chalk.gray(
      "Push schema to database"
    )}`
  );
  console.log();

  COMMAND_CATEGORIES.forEach((category) => {
    console.log(chalk.bold(`📁 ${category.name}:`));
    console.log(chalk.gray(`   ${category.description}`));

    category.commands.forEach((cmdName) => {
      const cmd = COMMAND_HELP[cmdName];
      if (cmd) {
        console.log(
          `   ${chalk.cyan(cmdName.padEnd(15))} ${chalk.gray(cmd.description)}`
        );
      }
    });
    console.log();
  });

  console.log(chalk.bold("🔧 Global Options:"));
  console.log(
    `  ${chalk.yellow("--help, -h".padEnd(20))} ${chalk.gray(
      "Show help for command"
    )}`
  );
  console.log(
    `  ${chalk.yellow("--version, -v".padEnd(20))} ${chalk.gray(
      "Show version number"
    )}`
  );
  console.log(
    `  ${chalk.yellow("--verbose".padEnd(20))} ${chalk.gray(
      "Enable verbose output"
    )}`
  );
  console.log(
    `  ${chalk.yellow("--quiet, -q".padEnd(20))} ${chalk.gray(
      "Suppress non-error output"
    )}`
  );
  console.log();

  console.log(chalk.bold("📚 Resources:"));
  console.log(`  ${chalk.blue("Documentation:")} https://lorm.dev/docs`);
  console.log(`  ${chalk.blue("GitHub:")} https://github.com/lorm-dev/lorm`);
  console.log(`  ${chalk.blue("Discord:")} https://discord.gg/lorm`);
  console.log();

  console.log(
    chalk.gray(
      "💡 Run 'npx @lorm/cli help <command>' for detailed command help"
    )
  );
  console.log();
}

export function displayCategoryHelp(categoryName: string): void {
  const category = COMMAND_CATEGORIES.find(
    (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
  );

  if (!category) {
    console.error(chalk.red(`Unknown category: ${categoryName}`));
    console.log(chalk.gray("Available categories:"));
    COMMAND_CATEGORIES.forEach((cat) => {
      console.log(`  ${chalk.cyan(cat.name)} - ${chalk.gray(cat.description)}`);
    });
    return;
  }

  console.log(chalk.bold.blue(`\n📁 ${category.name}`));
  console.log(chalk.gray(category.description));
  console.log();

  category.commands.forEach((cmdName) => {
    const cmd = COMMAND_HELP[cmdName];
    if (cmd) {
      console.log(chalk.bold(cmd.name));
      console.log(`  ${chalk.gray(cmd.description)}`);
      console.log(`  ${chalk.cyan(cmd.usage)}`);
      console.log();
    }
  });

  console.log(
    chalk.gray(
      `💡 Run 'npx @lorm/cli help <command>' for detailed command help`
    )
  );
  console.log();
}

export function displayQuickStart(): void {
  console.log(chalk.bold.blue("\n🚀 Lorm CLI Quick Start Guide"));
  console.log(chalk.gray("Get up and running with Lorm in minutes\n"));

  console.log(chalk.bold("1. Initialize your project:"));
  console.log(`   ${chalk.cyan("npx @lorm/cli init")}`);
  console.log(
    chalk.gray(
      "   This creates lorm.config.js, lorm.schema.js, and installs dependencies\n"
    )
  );

  console.log(chalk.bold("2. Set up your database:"));
  console.log(`   ${chalk.cyan("npx @lorm/cli db:push")}`);
  console.log(chalk.gray("   This pushes your schema to the database\n"));

  console.log(chalk.bold("3. Start developing:"));
  console.log(`   ${chalk.cyan("npx @lorm/cli dev")}`);
  console.log(
    chalk.gray("   This starts the development server with hot reloading\n")
  );

  console.log(chalk.bold("4. Optional - Open database studio:"));
  console.log(`   ${chalk.cyan("npx @lorm/cli db:studio")}`);
  console.log(
    chalk.gray("   This opens Drizzle Studio for database management\n")
  );

  console.log(chalk.bold("📚 Next Steps:"));
  console.log(`  • Read the docs: ${chalk.blue("https://lorm.dev/docs")}`);
  console.log(`  • Join our Discord: ${chalk.blue("https://discord.gg/lorm")}`);
  console.log(
    `  • Check out examples: ${chalk.blue(
      "https://github.com/lorm-dev/examples"
    )}`
  );
  console.log();
}
