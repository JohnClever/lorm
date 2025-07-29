#!/usr/bin/env node

import { readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

interface BundleFile {
  name: string;
  path: string;
  limit: number;
}

interface PackageConfig {
  files: BundleFile[];
}

type PackageConfigs = Record<string, PackageConfig>;

const packageName = process.env.npm_package_name || 'unknown';
const distDir = 'dist';

// Package-specific configurations
const packageConfigs: PackageConfigs = {
  '@lorm/client': {
    files: [
      { name: 'ESM Bundle', path: 'index.js', limit: 6 * 1024 },
      { name: 'CJS Bundle', path: 'index.cjs', limit: 6 * 1024 },
      { name: 'Type Definitions', path: 'index.d.ts', limit: 1 * 1024 }
    ]
  },
  '@lorm/cli': {
    files: [
      { name: 'ESM Bundle', path: 'index.js', limit: 55 * 1024 },
      { name: 'CJS Bundle', path: 'index.cjs', limit: 60 * 1024 },
      { name: 'Type Definitions', path: 'index.d.ts', limit: 5 * 1024 }
    ]
  },
  '@lorm/core': {
    files: [
      { name: 'ESM Bundle', path: 'index.js', limit: 30 * 1024 },
      { name: 'CJS Bundle', path: 'index.cjs', limit: 30 * 1024 },
      { name: 'Type Definitions', path: 'index.d.ts', limit: 3 * 1024 }
    ]
  },
  '@lorm/lib': {
    files: [
      { name: 'ESM Bundle', path: 'index.js', limit: 20 * 1024 },
      { name: 'CJS Bundle', path: 'index.cjs', limit: 20 * 1024 },
      { name: 'Type Definitions', path: 'index.d.ts', limit: 5 * 1024 }
    ]
  },
  '@lorm/schema': {
    files: [
      { name: 'ESM Bundle', path: 'index.js', limit: 15 * 1024 },
      { name: 'CJS Bundle', path: 'index.cjs', limit: 15 * 1024 },
      { name: 'Type Definitions', path: 'index.d.ts', limit: 2 * 1024 },
      // Adapter files
      { name: 'PG Adapter (ESM)', path: 'adapters/pg.js', limit: 5 * 1024 },
      { name: 'PG Adapter (CJS)', path: 'adapters/pg.cjs', limit: 5 * 1024 },
      { name: 'PG Adapter Types', path: 'adapters/pg.d.ts', limit: 1 * 1024 },
      { name: 'MySQL Adapter (ESM)', path: 'adapters/mysql.js', limit: 5 * 1024 },
      { name: 'MySQL Adapter (CJS)', path: 'adapters/mysql.cjs', limit: 5 * 1024 },
      { name: 'MySQL Adapter Types', path: 'adapters/mysql.d.ts', limit: 1 * 1024 },
      { name: 'SQLite Adapter (ESM)', path: 'adapters/sqlite.js', limit: 5 * 1024 },
      { name: 'SQLite Adapter (CJS)', path: 'adapters/sqlite.cjs', limit: 5 * 1024 },
      { name: 'SQLite Adapter Types', path: 'adapters/sqlite.d.ts', limit: 1 * 1024 }
    ]
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle(): void {
  const config = packageConfigs[packageName];
  
  if (!config) {
    console.log(`❌ No bundle size configuration found for package: ${packageName}`);
    process.exit(1);
  }

  console.log(`\n📦 Bundle Size Analysis - ${packageName}\n`);
  
  let allPassed = true;
  let analyzedFiles = 0;
  
  config.files.forEach((file: BundleFile) => {
    const filePath = join(distDir, file.path);
    
    if (!existsSync(filePath)) {
      // Skip optional files (like adapters that might not exist)
      if (file.path.includes('adapters/')) {
        return;
      }
      console.log(`❌ ${file.name}: File not found (${file.path})`);
      allPassed = false;
      return;
    }
    
    try {
      const content = readFileSync(filePath);
      const rawSize = statSync(filePath).size;
      const gzipSize = gzipSync(content).length;
      
      const passed = rawSize <= file.limit;
      allPassed = allPassed && passed;
      analyzedFiles++;
      
      const status = passed ? '✅' : '❌';
      const percentage = ((rawSize / file.limit) * 100).toFixed(1);
      
      console.log(`${status} ${file.name}`);
      console.log(`   Raw: ${formatBytes(rawSize)} (${percentage}% of ${formatBytes(file.limit)} limit)`);
      console.log(`   Gzipped: ${formatBytes(gzipSize)}`);
      console.log('');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${file.name}: Error reading file (${errorMessage})`);
      allPassed = false;
    }
  });
  
  if (analyzedFiles === 0) {
    console.log('⚠️  No files were analyzed. Make sure the package is built first.');
    process.exit(1);
  }
  
  if (allPassed) {
    console.log(`🎉 All bundles are within size limits! (${analyzedFiles} files analyzed)`);
    process.exit(0);
  } else {
    console.log(`⚠️  Some bundles exceed size limits! (${analyzedFiles} files analyzed)`);
    process.exit(1);
  }
}

analyzeBundle();