#!/usr/bin/env node

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [lorm] Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ [lorm] Uncaught exception:', error);
  process.exit(1);
});

// Import and run the CLI
import("../dist/index.js").catch((error) => {
  console.error('❌ [lorm] Failed to start CLI:', error);
  console.log('💡 Make sure @lorm/cli is properly built. Try running: pnpm build');
  process.exit(1);
});