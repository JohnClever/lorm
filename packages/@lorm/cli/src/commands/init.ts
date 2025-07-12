import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileExists, packageManager, routerTemplate, schemaTemplate, configTemplate } from "@lorm/lib";
import chalk from "chalk";
import { execSync } from "child_process";

const base = process.cwd();
const requiredDependencies = ["zod", "@lorm/core", "@lorm/schema", "@lorm/lib"];

const createFile = async (filepath: string, content: string) => {
  const full = path.resolve(base, filepath);
  if (await fileExists(full)) return;

  const dir = path.dirname(full);
  await mkdir(dir, { recursive: true });

  await writeFile(full, content, "utf8");
  console.log(chalk.green(`✅ Created ${filepath}`));
};

export async function initProject() {
  const pkgManager: "pnpm" | "yarn" | "npm" | "bun" = packageManager();

  const installCmd = {
    bun: `bun add ${requiredDependencies.join(" ")}`,
    pnpm: `pnpm add ${requiredDependencies.join(" ")}`,
    yarn: `yarn add ${requiredDependencies.join(" ")}`,
    npm: `npm install ${requiredDependencies.join(" ")}`,
  }[pkgManager];

  console.log(`Installing required dependencies using ${pkgManager}...`);
  execSync(installCmd, { stdio: "inherit" });
  
  await createFile("lorm.router.js", routerTemplate);

  await createFile("lorm.schema.js", schemaTemplate);

  await createFile("lorm.config.js", configTemplate);

  console.log(chalk.blue(`\n✨ lorm project initialized!`));
  console.log(
    `👉 You can now run: ${chalk.bold(
      "lorm dev"
    )} to start your lorm dev server`
  );
}
