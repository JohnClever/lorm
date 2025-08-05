import { initializeCommand, handleCommandError, executeDrizzleKit } from "../../utils/index";

export async function push(): Promise<void> {
  try {
    const { lormDir } = await initializeCommand("schema push");
    await executeDrizzleKit(
      "push",
      lormDir,
      "Schema pushed to database successfully!"
    );
  } catch (error) {
    handleCommandError(error instanceof Error ? error : String(error), "Push");
  }
}
