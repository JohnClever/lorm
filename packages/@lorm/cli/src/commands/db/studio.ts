import {
  handleAdvancedCommandError,
  initializeAdvancedCommand,
} from "@/utils/setup";
import { executeDrizzleKit } from "../../utils/index";

export async function studio(): Promise<void> {
  const startTime = Date.now();

  try {
    const { lormDir } = await initializeAdvancedCommand("studio");

    console.log("🎨 [lorm] Starting Drizzle Studio...");
    await executeDrizzleKit("studio", lormDir, "Studio successfully launched");

    const duration = Date.now() - startTime;
    console.log(`✅ [lorm] Studio started successfully! (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    handleAdvancedCommandError(
      error instanceof Error ? error : String(error),
      "Studio",
      duration
    );
  }
}
