import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileExists, packageManager } from "@lorm/lib";
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
  // 1. Create lorm.procedures.js
  await createFile(
    "lorm.procedures.js",
    `import { defineProcedure } from "@lorm/core";
import { z } from "zod";
import { schema } from "./lorm.schema.js";


export const createUsers = defineProcedure({
  input: z.object({
    name: z.string()
  }),
  resolve: async ({input, db}) => {
    try {
      const [users] = await db.insert(schema.users).values({
        name: input.name
      }).returning()
      console.log({users})
      return users
    } catch (error) {
      console.log({error})
      throw new Error("Something went wrong in createUsers procedure");
    }
  }

})

export const getAllUsers = defineProcedure({
  input: z.void(),
  resolve: async ({ db }) => {
    try {
      const res = await db.select().from(schema.users);
      console.log({res})
      return  res
    } catch (err) {
      console.error("Error in procedure:", err);
      throw new Error("Something went wrong in hello procedure");
    }
   
  },
})



export const router = {
  getAllUsers,
  createUsers
}`
  );

  // 2. Create lorm.schema.js
  await createFile(
    "lorm.schema.js",
    `import { pgTable, uuid, varchar } from "@lorm/schema";\n\nexport const users = pgTable("users", {\n  id: uuid("id").defaultRandom().primaryKey(),\n  name: varchar("name", { length: 255 })\n});\n\nexport const schema = { users };`
  );

  // 3. Create lorm.config.js
  await createFile(
    "lorm.config.js",
    `export default {\n  db: {\n    url: "your_neon_database_url_here"\n  }\n}`
  );

  console.log(chalk.blue(`\n✨ lorm project initialized!`));
  console.log(
    `👉 You can now run: ${chalk.bold(
      "lorm dev"
    )} to start your lorm dev server`
  );
}
