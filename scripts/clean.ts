#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const cleanTargets = [
  '.turbo',
  'node_modules',
  'dist',
  '.trae',
  '.lorm'
];


function cleanProject(): void {
  console.log('🧹 Starting cleanup process...');
  
  let totalCleaned = 0;
  
  for (const target of cleanTargets) {
    console.log(`\n🔍 Searching for ${target} directories...`);
    
    try {
      const findCommand = `find "${projectRoot}" -name "${target}" -type d 2>/dev/null || true`;
      const result = execSync(findCommand, { encoding: 'utf8' });
      
      const paths = result.trim().split('\n').filter(path => path.length > 0);
      
      if (paths.length === 0) {
        console.log(`   ✅ No ${target} directories found`);
        continue;
      }
      
      console.log(`   📁 Found ${paths.length} ${target} director${paths.length === 1 ? 'y' : 'ies'}`);
      
      for (const path of paths) {
        if (existsSync(path)) {
          try {
            rmSync(path, { recursive: true, force: true });
            console.log(`   🗑️  Removed: ${path}`);
            totalCleaned++;
          } catch (error) {
            console.error(`   ❌ Failed to remove ${path}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error searching for ${target}:`, error);
    }
  }
  
  console.log(`\n✨ Cleanup complete! Removed ${totalCleaned} directories/files.`);
  
  const lockFiles = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
  console.log('\n🔍 Checking for lock files to preserve...');
  
  for (const lockFile of lockFiles) {
    const lockPath = join(projectRoot, lockFile);
    if (existsSync(lockPath)) {
      console.log(`   ✅ Preserving ${lockFile}`);
    }
  }
  
  console.log('\n🎉 All done! Your codebase is now clean.');
  console.log('💡 Run `pnpm install` to reinstall dependencies.');
}

cleanProject();