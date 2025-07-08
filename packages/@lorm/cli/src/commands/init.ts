import { writeFile } from "fs/promises";
import path from "path";
import { fileExists, packageManager } from "@lorm/lib";
import chalk from "chalk";
import { execSync } from "child_process";

const base = process.cwd();
const requiredDependencies = ["zod", "@lorm/core", "@lorm/schema", "@lorm/lib"];

const createFile = async (filepath: string, content: string) => {
  const full = path.resolve(base, filepath);
  if (await fileExists(full)) return;
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
  // 1. Create lorm.procedures.ts
  await createFile(
    "lorm.procedures.ts",
    `import { defineProcedure } from "@lorm/core";\nimport { z } from "zod";\n\nexport const hello = defineProcedure({\n  input: z.object({ name: z.string() }),\n  resolve: async ({ input }) => ({\n    message: \`Hello, \${input.name}!\`,\n  }),\n});\n\nexport const router = { hello };\n`
  );

  // 2. Create .lorm/types.ts (instead of lorm.types.ts)
  await createFile(
    ".lorm/types.ts",
    `import type { router } from "../lorm.procedures";\nexport type lormRouter = typeof router;\n`
  );

  // 3. Create lorm.schema.ts
  await createFile(
    "lorm.schema.ts",
    `import { pgTable, uuid, varchar } from "@lorm/schema";\n\nexport const users = pgTable("users", {\n  id: uuid("id").defaultRandom().primaryKey(),\n  name: varchar("name", { length: 255 })\n});\n\nexport const schema = { users };`
  );

  // 4. Create lorm.config.ts
  await createFile(
    "lorm.config.ts",
    `export default {\n  db: {\n    url: "your_neon_database_url_here"\n  }\n}`
  );

  console.log(chalk.blue(`\n✨ lorm project initialized!`));
  console.log(
    `👉 You can now run: ${chalk.bold(
      "lorm dev"
    )} to start your lorm dev server`
  );
}
