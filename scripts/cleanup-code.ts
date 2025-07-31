#!/usr/bin/env tsx

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CleanupStats {
  filesProcessed: number;
  commentsRemoved: number;
  unusedImportsRemoved: number;
  bytesReduced: number;
}

interface FilePreview {
  filePath: string;
  commentsToRemove: number;
  unusedImportsToRemove: number;
  bytesReduction: number;
  preview: string;
}

interface CleanupPreview {
  files: FilePreview[];
  totalFiles: number;
  totalComments: number;
  totalUnusedImports: number;
  totalBytesReduction: number;
}

class CodeCleaner {
  private stats: CleanupStats = {
    filesProcessed: 0,
    commentsRemoved: 0,
    unusedImportsRemoved: 0,
    bytesReduced: 0
  };

  private rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  async cleanupCodebase(rootDir: string, targetDirs: string[] = ['src']): Promise<void> {
    console.log('🧹 Starting codebase cleanup...');
    
    // First, scan and preview changes
    const preview = await this.scanForChanges(rootDir, targetDirs);
    
    if (preview.totalFiles === 0) {
      console.log('✨ No files need cleaning!');
      this.rl.close();
      return;
    }

    // Show preview
    this.displayPreview(preview);
    
    // Ask user to select files
    const selectedFiles = await this.selectFiles(preview.files);
    
    if (selectedFiles.length === 0) {
      console.log('❌ No files selected. Cleanup cancelled.');
      this.rl.close();
      return;
    }

    // Ask for final confirmation
    const confirmed = await this.confirmCleanup(selectedFiles);
    
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user.');
      this.rl.close();
      return;
    }

    // Proceed with cleanup
    await this.performCleanup(selectedFiles);
    this.printStats();
    this.rl.close();
  }

  private async scanForChanges(rootDir: string, targetDirs: string[]): Promise<CleanupPreview> {
    const files: FilePreview[] = [];
    
    for (const targetDir of targetDirs) {
      const fullPath = join(rootDir, targetDir);
      try {
        await this.scanDirectory(fullPath, files);
      } catch (error) {
        console.warn(`⚠️  Skipping directory ${targetDir}: ${error}`);
      }
    }

    const totalFiles = files.length;
    const totalComments = files.reduce((sum, f) => sum + f.commentsToRemove, 0);
    const totalUnusedImports = files.reduce((sum, f) => sum + f.unusedImportsToRemove, 0);
    const totalBytesReduction = files.reduce((sum, f) => sum + f.bytesReduction, 0);

    return {
      files,
      totalFiles,
      totalComments,
      totalUnusedImports,
      totalBytesReduction
    };
  }

  private async scanDirectory(dirPath: string, files: FilePreview[]): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.scanDirectory(fullPath, files);
        }
      } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
        const preview = await this.previewFile(fullPath);
        if (preview) {
          files.push(preview);
        }
      }
    }
  }

  private async processDirectory(dirPath: string): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.processDirectory(fullPath);
        }
      } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
        await this.processFile(fullPath);
      }
    }
  }

  private isTypeScriptFile(filename: string): boolean {
    const ext = extname(filename);
    return ext === '.ts' || ext === '.tsx';
  }

  private async previewFile(filePath: string): Promise<FilePreview | null> {
    try {
      const originalContent = await readFile(filePath, 'utf-8');
      const originalSize = originalContent.length;
      
      let cleanedContent = originalContent;
      let commentsRemoved = 0;
      let unusedImportsRemoved = 0;

      cleanedContent = this.removeComments(cleanedContent);
      commentsRemoved = this.countRemovedComments(originalContent, cleanedContent);

      const { content: contentWithoutUnusedImports, removedCount } = this.removeUnusedImports(cleanedContent);
      cleanedContent = contentWithoutUnusedImports;
      unusedImportsRemoved = removedCount;

      if (cleanedContent !== originalContent) {
        const bytesReduction = originalSize - cleanedContent.length;
        const preview = this.generatePreview(originalContent, cleanedContent);
        
        return {
          filePath,
          commentsToRemove: commentsRemoved,
          unusedImportsToRemove: unusedImportsRemoved,
          bytesReduction,
          preview
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error previewing ${filePath}:`, error);
      return null;
    }
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const originalContent = await readFile(filePath, 'utf-8');
      const originalSize = originalContent.length;
      
      let cleanedContent = originalContent;
      let commentsRemoved = 0;
      let unusedImportsRemoved = 0;

      cleanedContent = this.removeComments(cleanedContent);
      commentsRemoved = this.countRemovedComments(originalContent, cleanedContent);

      const { content: contentWithoutUnusedImports, removedCount } = this.removeUnusedImports(cleanedContent);
      cleanedContent = contentWithoutUnusedImports;
      unusedImportsRemoved = removedCount;

      if (cleanedContent !== originalContent) {
        await writeFile(filePath, cleanedContent, 'utf-8');
        
        this.stats.filesProcessed++;
        this.stats.commentsRemoved += commentsRemoved;
        this.stats.unusedImportsRemoved += unusedImportsRemoved;
        this.stats.bytesReduced += originalSize - cleanedContent.length;
        
        console.log(`✅ Cleaned: ${filePath}`);
        if (commentsRemoved > 0) console.log(`   📝 Removed ${commentsRemoved} comments`);
        if (unusedImportsRemoved > 0) console.log(`   📦 Removed ${unusedImportsRemoved} unused imports`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  private removeComments(content: string): string {
    let result = content;
    
    result = result.replace(/\/\*\*[\s\S]*?\*\//g, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/^\s*\/\/.*$/gm, '');
    result = result.replace(/\s+\/\/.*$/gm, '');
    
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.replace(/^\s*\n/gm, '');
    
    return result;
  }

  private countRemovedComments(original: string, cleaned: string): number {
    const originalComments = (
      (original.match(/\/\*\*[\s\S]*?\*\//g) || []).length +
      (original.match(/\/\*[\s\S]*?\*\//g) || []).length +
      (original.match(/\/\/.*$/gm) || []).length
    );
    
    const remainingComments = (
      (cleaned.match(/\/\*\*[\s\S]*?\*\//g) || []).length +
      (cleaned.match(/\/\*[\s\S]*?\*\//g) || []).length +
      (cleaned.match(/\/\/.*$/gm) || []).length
    );
    
    return originalComments - remainingComments;
  }

  private removeUnusedImports(content: string): { content: string; removedCount: number } {
    const lines = content.split('\n');
    const imports: Array<{ line: number; statement: string; identifiers: string[] }> = [];
    const usedIdentifiers = new Set<string>();
    let removedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') && !line.includes('import type')) {
        const identifiers = this.extractImportIdentifiers(line);
        if (identifiers.length > 0) {
          imports.push({ line: i, statement: line, identifiers });
        }
      }
    }

    const codeContent = lines.slice(imports.length).join('\n');
    
    for (const importInfo of imports) {
      for (const identifier of importInfo.identifiers) {
        if (this.isIdentifierUsed(identifier, codeContent)) {
          usedIdentifiers.add(identifier);
        }
      }
    }

    const filteredLines = [...lines];
    for (let i = imports.length - 1; i >= 0; i--) {
      const importInfo = imports[i];
      const usedInThisImport = importInfo.identifiers.filter(id => usedIdentifiers.has(id));
      
      if (usedInThisImport.length === 0) {
        filteredLines.splice(importInfo.line, 1);
        removedCount++;
      } else if (usedInThisImport.length < importInfo.identifiers.length) {
        const newImportStatement = this.rebuildImportStatement(importInfo.statement, usedInThisImport);
        filteredLines[importInfo.line] = newImportStatement;
      }
    }

    return { content: filteredLines.join('\n'), removedCount };
  }

  private extractImportIdentifiers(importStatement: string): string[] {
    const match = importStatement.match(/import\s+(?:{([^}]+)}|([^\s,]+))\s+from/);
    if (!match) return [];

    if (match[1]) {
      return match[1].split(',').map(id => id.trim().split(' as ')[0].trim());
    } else if (match[2]) {
      return [match[2].trim()];
    }
    
    return [];
  }

  private isIdentifierUsed(identifier: string, content: string): boolean {
    const regex = new RegExp(`\\b${identifier}\\b`, 'g');
    return regex.test(content);
  }

  private rebuildImportStatement(original: string, usedIdentifiers: string[]): string {
    const fromMatch = original.match(/from\s+['"][^'"]+['"]/);
    if (!fromMatch) return original;
    
    const fromPart = fromMatch[0];
    
    if (usedIdentifiers.length === 1 && !original.includes('{')) {
      return `import ${usedIdentifiers[0]} ${fromPart};`;
    } else {
      return `import { ${usedIdentifiers.join(', ')} } ${fromPart};`;
    }
  }

  private displayPreview(preview: CleanupPreview): void {
    console.log('\n📋 Cleanup Preview:');
    console.log(`   📁 Files to clean: ${preview.totalFiles}`);
    console.log(`   📝 Comments to remove: ${preview.totalComments}`);
    console.log(`   📦 Unused imports to remove: ${preview.totalUnusedImports}`);
    console.log(`   💾 Bytes to reduce: ${preview.totalBytesReduction}`);
    console.log('\n📄 Files that will be affected:');
    
    preview.files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.filePath}`);
      if (file.commentsToRemove > 0) {
        console.log(`   📝 ${file.commentsToRemove} comments`);
      }
      if (file.unusedImportsToRemove > 0) {
        console.log(`   📦 ${file.unusedImportsToRemove} unused imports`);
      }
      console.log(`   💾 ${file.bytesReduction} bytes reduction`);
    });
  }

  private async selectFiles(files: FilePreview[]): Promise<FilePreview[]> {
    console.log('\n🎯 Select files to clean:');
    console.log('Enter file numbers (comma-separated) or "all" for all files:');
    
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.filePath}`);
    });
    
    const answer = await this.question('Your selection: ');
    
    if (answer.toLowerCase().trim() === 'all') {
      return files;
    }
    
    const selectedIndices = answer
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < files.length);
    
    return selectedIndices.map(i => files[i]);
  }

  private async confirmCleanup(selectedFiles: FilePreview[]): Promise<boolean> {
    console.log('\n⚠️  Final Confirmation:');
    console.log(`You are about to clean ${selectedFiles.length} file(s):`);
    
    selectedFiles.forEach(file => {
      console.log(`  - ${file.filePath}`);
    });
    
    const totalComments = selectedFiles.reduce((sum, f) => sum + f.commentsToRemove, 0);
    const totalImports = selectedFiles.reduce((sum, f) => sum + f.unusedImportsToRemove, 0);
    const totalBytes = selectedFiles.reduce((sum, f) => sum + f.bytesReduction, 0);
    
    console.log(`\nThis will remove:`);
    console.log(`  📝 ${totalComments} comments`);
    console.log(`  📦 ${totalImports} unused imports`);
    console.log(`  💾 ${totalBytes} bytes`);
    
    const answer = await this.question('\nProceed with cleanup? (y/N): ');
    return answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes';
  }

  private async performCleanup(selectedFiles: FilePreview[]): Promise<void> {
    console.log('\n🧹 Performing cleanup...');
    
    for (const filePreview of selectedFiles) {
      await this.processFile(filePreview.filePath);
    }
  }

  private generatePreview(originalContent: string, cleanedContent: string): string {
    const originalLines = originalContent.split('\n');
    const cleanedLines = cleanedContent.split('\n');
    
    let preview = '';
    let changes = 0;
    
    for (let i = 0; i < Math.max(originalLines.length, cleanedLines.length) && changes < 5; i++) {
      const original = originalLines[i] || '';
      const cleaned = cleanedLines[i] || '';
      
      if (original !== cleaned) {
        preview += `Line ${i + 1}:\n`;
        if (original) preview += `- ${original}\n`;
        if (cleaned) preview += `+ ${cleaned}\n`;
        changes++;
      }
    }
    
    return preview || 'No preview available';
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private printStats(): void {
    console.log('\n📊 Cleanup Statistics:');
    console.log(`   Files processed: ${this.stats.filesProcessed}`);
    console.log(`   Comments removed: ${this.stats.commentsRemoved}`);
    console.log(`   Unused imports removed: ${this.stats.unusedImportsRemoved}`);
    console.log(`   Bytes reduced: ${this.stats.bytesReduced.toLocaleString()}`);
    console.log('\n✨ Cleanup completed!');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const rootDir = args[0] || process.cwd();
  const targetDirs = args.slice(1).length > 0 ? args.slice(1) : ['src'];

  console.log(`🎯 Target directory: ${rootDir}`);
  console.log(`📁 Processing subdirectories: ${targetDirs.join(', ')}`);
  
  const cleaner = new CodeCleaner();
  await cleaner.cleanupCodebase(rootDir, targetDirs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CodeCleaner };