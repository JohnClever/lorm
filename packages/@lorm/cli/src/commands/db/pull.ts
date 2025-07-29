import { executeDrizzleKit } from "@lorm/lib";
import {
 
  initializeAdvancedCommand,
  handleAdvancedCommandError,
} from "../../utils/index.js";

export async function pull(): Promise<void> {
  const startTime = Date.now();

  try {
    const { lormDir } = await initializeAdvancedCommand("pull");

    console.log("🔄 [lorm] Pulling schema from database...");
    await executeDrizzleKit("pull", lormDir, "Schema pull successfully!");

    const duration = Date.now() - startTime;
    console.log(
      `✅ [lorm] Schema pulled from database successfully! (${duration}ms)`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    handleAdvancedCommandError(error, "Pull", duration);
  }
}
