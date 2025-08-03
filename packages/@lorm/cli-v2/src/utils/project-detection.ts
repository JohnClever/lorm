import { findProjectRoot, readPackageJson, findExistingFile } from './file-operations.js';
import { 
  type PackageJson,
  isMobileProject,
  isLibraryProject,
  hasTypeScript,
  FRAMEWORKS
} from './dependency-utils.js';

/**
 * Project type detection based on files and dependencies
 * LORM is mobile-first, focusing on React Native and Expo
 */
export type ProjectType = 'mobile' | 'library' | 'unknown';

// PackageJson interface is now imported from dependency-utils

/**
 * Project context information
 */
export interface ProjectContext {
  root: string;
  type: ProjectType;
  packageJson?: PackageJson;
  hasLormConfig: boolean;
  framework?: string;
  language: 'typescript' | 'javascript';
}

// findProjectRoot is now imported from file-operations utility

/**
 * Detect project type based on dependencies and files
 * LORM focuses on mobile development with React Native and Expo
 */
export async function detectProjectType(_projectRoot: string, packageJson?: PackageJson | undefined): Promise<ProjectType> {
  if (!packageJson) {
    return 'unknown';
  }

  // Check for mobile project
  if (isMobileProject(packageJson)) {
    return 'mobile';
  }

  // Check for library project
  if (isLibraryProject(packageJson)) {
    return 'library';
  }

  return 'unknown';
}

/**
 * Detect primary framework
 */
export function detectFramework(packageJson?: PackageJson | undefined): string | undefined {
  if (!packageJson) return undefined;

  // Use the frameworks from dependency utilities
  for (const framework of FRAMEWORKS) {
    if (framework.deps.some(dep => {
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      return dependencies[dep];
    })) {
      return framework.name;
    }
  }

  return undefined;
}

/**
 * Detect language (TypeScript vs JavaScript)
 */
export async function detectLanguage(projectRoot: string, packageJson?: PackageJson | undefined): Promise<'typescript' | 'javascript'> {
  // Check for TypeScript config files
  const tsConfigFiles = ['tsconfig.json', 'tsconfig.base.json', 'jsconfig.json'];
  const existingConfigFile = await findExistingFile(projectRoot, tsConfigFiles);
  
  if (existingConfigFile) {
    return 'typescript';
  }

  // Check for TypeScript dependencies using utility
  if (hasTypeScript(packageJson)) {
    return 'typescript';
  }

  return 'javascript';
}

/**
 * Check if LORM configuration exists
 */
export async function hasLormConfig(projectRoot: string): Promise<boolean> {
  const configFiles = ['.lormrc', '.lormrc.json', '.lormrc.yml', '.lormrc.yaml'];
  const existingConfigFile = await findExistingFile(projectRoot, configFiles);
  
  if (existingConfigFile) {
    return true;
  }

  // Check package.json for lorm config
  const packageJson = await readPackageJson(projectRoot);
  return !!(packageJson?.lorm);
}

/**
 * Main project detection function
 */
export async function detectProject(startPath?: string): Promise<ProjectContext> {
  const projectRoot = await findProjectRoot(startPath);
  const packageJson = await readPackageJson(projectRoot);

  const [type, framework, language, hasLormConfigResult] = await Promise.all([
    detectProjectType(projectRoot, packageJson),
    Promise.resolve(detectFramework(packageJson)),
    detectLanguage(projectRoot, packageJson),
    hasLormConfig(projectRoot)
  ]);

  return {
    root: projectRoot,
    type,
    ...(packageJson && { packageJson }),
    hasLormConfig: hasLormConfigResult,
    ...(framework && { framework }),
    language
  };
}