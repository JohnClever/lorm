#!/usr/bin/env node

import { bootstrap } from './cli/bootstrap.js';

/**
 * Main entry point for LORM CLI v2
 * Optimized for ephemeral execution via npx or pnpm dlx
 */
async function main(): Promise<void> {
  try {
    await bootstrap();
    // Force exit after successful bootstrap completion
    process.exit(0);
  } catch (error) {
    console.error('❌ LORM CLI v2 failed to start:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the CLI
main();

export { bootstrap };