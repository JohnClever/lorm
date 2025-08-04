#!/usr/bin/env node

// Import the main CLI module
import('../dist/index.js').catch((error) => {
  console.error('Failed to start LORM CLI v2:', error.message);
  process.exit(1);
});