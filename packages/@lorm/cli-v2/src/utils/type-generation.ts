import { promises as fs } from 'fs';
import { join } from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { Logger, ICONS } from './logger.js';
import { getTypeTemplate } from './templates.js';
import { detectLanguage } from '../utils/project-detection.js';

/**
 * Type generation utilities for LORM CLI v2
 * Migrated from v1 with improvements
 */

/**
 * Generate types.d.ts file based on router files
 */
export async function generateTypeFile(projectRoot: string = process.cwd()): Promise<void> {
  try {
    const routerDir = join(projectRoot, 'lorm');
    const schemaDir = join(projectRoot, 'lorm');
    const lormDir = join(projectRoot, '.lorm');
    const typesPath = join(lormDir, 'types.d.ts');
    const legacyRouterPath = join(projectRoot, 'lorm.router.js');

    // Check if router directory or legacy router file exists
    const routerExists = await fs.access(routerDir).then(() => true).catch(() => false);
    const legacyRouterExists = await fs.access(legacyRouterPath).then(() => true).catch(() => false);
    
    if (!routerExists && !legacyRouterExists) {
      Logger.dim('No router files found, skipping type generation');
      return;
    }

    // Detect language
    const language = await detectLanguage(projectRoot);
    const isTypeScript = language === 'typescript';

    // Ensure .lorm directory exists
    await fs.mkdir(lormDir, { recursive: true });

    // Generate appropriate template
    const routerPath = isTypeScript ? '../lorm/router' : '../lorm.router';
    const template = getTypeTemplate(routerPath);
    
    // Write types file
    await fs.writeFile(typesPath, template);
    
    Logger.success(`Generated ${isTypeScript ? 'TypeScript' : 'JavaScript'} types at .lorm/types.d.ts`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to generate types: ${errorMessage}`);
    throw error;
  }
}

/**
 * Watch router files and regenerate types on changes
 */
export function watchRouter(projectRoot: string = process.cwd()): FSWatcher {
  const routerDir = join(projectRoot, 'lorm/router');
  const schemaDir = join(projectRoot, 'lorm/schema');
  const lormDir = join(projectRoot, 'lorm');
  const legacyRouterPath = join(projectRoot, 'lorm.router.js');

  const watchPaths = [routerDir, schemaDir, lormDir, legacyRouterPath];
  
  Logger.withIcon(ICONS.search, `Watching for changes in: ${watchPaths.join(', ')}`, 'dim');

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });

  // Handle file events
  watcher
    .on('add', async (path) => {
      Logger.dim(`File added: ${path}`);
      await generateTypeFile(projectRoot);
    })
    .on('change', async (path) => {
      Logger.dim(`File changed: ${path}`);
      await generateTypeFile(projectRoot);
    })
    .on('unlink', async (path) => {
      Logger.dim(`File removed: ${path}`);
      await generateTypeFile(projectRoot);
    })
    .on('addDir', async (path) => {
      Logger.dim(`Directory added: ${path}`);
      await generateTypeFile(projectRoot);
    })
    .on('unlinkDir', async (path) => {
      Logger.dim(`Directory removed: ${path}`);
      await generateTypeFile(projectRoot);
    })
    .on('error', (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Watcher error: ${errorMessage}`);
    });

  // Graceful shutdown
  const cleanup = () => {
    Logger.dim('Stopping file watcher...');
    watcher.close();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return watcher;
}

/**
 * Initialize type generation for a project
 */
export async function initializeTypeGeneration(projectRoot: string = process.cwd()): Promise<void> {
  try {
    Logger.withIcon(ICONS.build, 'Initializing type generation...', 'info');
    await generateTypeFile(projectRoot);
    Logger.success('Type generation initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to initialize type generation: ${errorMessage}`);
    throw error;
  }
}