import { executeDrizzleKit } from "@lorm/lib";
import { handleCommandError, initializeCommand } from "../../utils/index.js";



export async function generate(): Promise<void> {
  try {
    const { lormDir } = await initializeCommand("migration generation");
    await executeDrizzleKit("generate", lormDir, "Migration files generated successfully!");
  } catch (error) {
    handleCommandError(error, "Migration generation");
  }
}
