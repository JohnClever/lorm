import { executeDrizzleKit } from "../../utils/index";
import {
  initializeAdvancedCommand,
  handleAdvancedCommandError,
} from "../../utils/index";

export async function up(): Promise<void> {
  const startTime = Date.now();

  try {
    const { lormDir } = await initializeAdvancedCommand("up");

    await executeDrizzleKit("up", lormDir, "Schema upgraded successfully!");

    const duration = Date.now() - startTime;
    console.log(`✅ [lorm] Up command completed successfully! (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    handleAdvancedCommandError(error, "Up", duration);
  }
}
