import { executeDrizzleKit } from "../../utils/index";
import {
  initializeCommand,
  handleCommandError,
} from "../../utils/index";

export async function push(): Promise<void> {
  try {
    const { lormDir } = await initializeCommand("schema push");
    await executeDrizzleKit(
      "push",
      lormDir,
      "Schema pushed to database successfully!"
    );
  } catch (error) {
    handleCommandError(error, "Push");
  }
}
