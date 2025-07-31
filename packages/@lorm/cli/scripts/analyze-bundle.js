#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bundle analyzer for @lorm/cli
 * Analyzes the generated metafile and provides bundle size insights
 */
class BundleAnalyzer {
  constructor() {
    this.metafilePath = path.join(__dirname, '../dist/metafile-cjs.json');
    this.outputPath = path.join(__dirname, '../bundle-analysis.json');
  }

  analyze() {
    try {
      if (!fs.existsSync(this.metafilePath)) {
        console.log('⚠️  Metafile not found, skipping bundle analysis');
        return;
      }

      const metafile = JSON.parse(fs.readFileSync(this.metafilePath, 'utf8'));
      const analysis = this.generateAnalysis(metafile);
      
      this.saveAnalysis(analysis);
      this.printSummary(analysis);
      this.checkSizeThresholds(analysis);
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  generateAnalysis(metafile) {
    const outputs = metafile.outputs || {};
    const totalSize = Object.values(outputs).reduce((sum, output) => sum + (output.bytes || 0), 0);
    
    const fileAnalysis = Object.entries(outputs).map(([file, data]) => ({
      file: path.basename(file),
      size: data.bytes || 0,
      percentage: ((data.bytes || 0) / totalSize * 100).toFixed(2)
    })).sort((a, b) => b.size - a.size);

    return {
      timestamp: new Date().toISOString(),
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      files: fileAnalysis,
      largestFiles: fileAnalysis.slice(0, 5),
      thresholds: {
        warning: 1024 * 1024, // 1MB
        error: 5 * 1024 * 1024 // 5MB
      }
    };
  }

  saveAnalysis(analysis) {
    const history = this.loadHistory();
    history.push(analysis);
    
    // Keep only last 10 analyses
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    
    fs.writeFileSync(this.outputPath, JSON.stringify(history, null, 2));
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.outputPath)) {
        return JSON.parse(fs.readFileSync(this.outputPath, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load bundle history:', error.message);
    }
    return [];
  }

  printSummary(analysis) {
    console.log('\n📦 Bundle Analysis Summary');
    console.log('=' .repeat(40));
    console.log(`Total bundle size: ${analysis.totalSizeFormatted}`);
    console.log(`\nLargest files:`);
    
    analysis.largestFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.file}: ${this.formatBytes(file.size)} (${file.percentage}%)`);
    });
    
    const history = this.loadHistory();
    if (history.length > 1) {
      const previous = history[history.length - 2];
      const sizeDiff = analysis.totalSize - previous.totalSize;
      const diffFormatted = this.formatBytes(Math.abs(sizeDiff));
      const trend = sizeDiff > 0 ? `📈 +${diffFormatted}` : sizeDiff < 0 ? `📉 -${diffFormatted}` : '➡️  No change';
      console.log(`\nSize change: ${trend}`);
    }
    
    console.log('\n');
  }

  checkSizeThresholds(analysis) {
    if (analysis.totalSize > analysis.thresholds.error) {
      console.error(`❌ Bundle size (${analysis.totalSizeFormatted}) exceeds error threshold (${this.formatBytes(analysis.thresholds.error)})`);
      process.exit(1);
    } else if (analysis.totalSize > analysis.thresholds.warning) {
      console.warn(`⚠️  Bundle size (${analysis.totalSizeFormatted}) exceeds warning threshold (${this.formatBytes(analysis.thresholds.warning)})`);
    } else {
      console.log(`✅ Bundle size is within acceptable limits`);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze();
}

export default BundleAnalyzer;