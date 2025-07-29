import {
  executeDrizzleKit,
  handleCommandError,
  initializeCommand,
} from "@/utils";

export async function generate(): Promise<void> {
  try {
    const { lormDir } = await initializeCommand("migration generation");
    await executeDrizzleKit(
      "generate",
      lormDir,
      "Migration files generated successfully!"
    );
  } catch (error) {
    handleCommandError(error, "Migration generation");
  }
}
