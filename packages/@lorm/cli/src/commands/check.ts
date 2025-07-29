import { executeDrizzleKit, validateConfigOrExit } from "@lorm/lib";
import { initializeCommand, handleCommandError } from "../utils/index.js";
import chalk from "chalk";

export async function check(options: { verbose?: boolean; fix?: boolean } = {}): Promise<void> {
  try {
    console.log(chalk.blue("[lorm] 🔍 Checking Lorm project setup..."));

    await validateConfigOrExit({ 
      requireConfig: true, 
      requireSchema: true,
      checkDatabase: false 
    });

    if (options.verbose) {
      console.log(chalk.green('✓ Configuration validation passed'));
    }

    const { lormDir } = await initializeCommand("schema check");

    console.log(chalk.blue("\n[lorm] Running drizzle-kit check..."));
    
    await executeDrizzleKit(
      "check",
      lormDir,
      "✅ Schema check passed successfully!"
    );

    if (options.fix) {
      console.log(chalk.yellow("\n💡 Auto-fix suggestions:"));
      console.log(chalk.yellow("  • Run 'npx @lorm/cli db:generate' to create migrations"));
      console.log(chalk.yellow("  • Run 'npx @lorm/cli gen-types' to update type definitions"));
    }

    console.log(chalk.green("\n✅ All checks passed!"));
  } catch (error) {
    handleCommandError(error, "Check");
  }
}
