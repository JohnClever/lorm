/**
 * Utility functions for handling package dependencies
 * Consolidates repeated dependency merging and checking patterns
 */

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  main?: string;
  module?: string;
  exports?: any;
  [key: string]: any;
}

/**
 * Merge all dependency types from package.json into a single object
 */
export function mergeDependencies(packageJson?: PackageJson): Record<string, string> {
  if (!packageJson) {
    return {};
  }

  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  };
}

/**
 * Check if any dependency matches the given patterns
 */
export function hasDependencyMatching(
  packageJson: PackageJson | undefined,
  patterns: string[]
): boolean {
  const dependencies = mergeDependencies(packageJson);
  const depNames = Object.keys(dependencies);
  return depNames.some(dep => 
    patterns.some(pattern => dep.includes(pattern))
  );
}

/**
 * Check if any dependency exactly matches the given names
 */
export function hasDependency(
  packageJson: PackageJson | undefined,
  dependencyNames: string[]
): boolean {
  const dependencies = mergeDependencies(packageJson);
  return dependencyNames.some(name => dependencies[name]);
}

/**
 * Framework detection patterns
 */
export const FRAMEWORK_PATTERNS = {
  mobile: [
    'react-native',
    '@react-native',
    'expo',
    '@expo',
    'ionic',
    '@ionic'
  ],
  reactNative: ['react-native'],
  expo: ['expo'],
  ionic: ['@ionic/react', '@ionic/angular', '@ionic/vue'],
  typescript: ['typescript', '@types/node']
};

/**
 * Framework definitions for detection
 */
export const FRAMEWORKS = [
  { name: 'React Native', deps: FRAMEWORK_PATTERNS.reactNative },
  { name: 'Expo', deps: FRAMEWORK_PATTERNS.expo },
  { name: 'Ionic', deps: FRAMEWORK_PATTERNS.ionic }
] as const;

/**
 * Detect if package.json indicates a library project
 */
export function isLibraryProject(packageJson?: PackageJson): boolean {
  if (!packageJson) return false;
  return !!(packageJson.main || packageJson.module || packageJson.exports);
}

/**
 * Detect if package.json indicates a mobile project
 */
export function isMobileProject(packageJson?: PackageJson): boolean {
  return hasDependencyMatching(packageJson, FRAMEWORK_PATTERNS.mobile);
}

/**
 * Detect if package.json indicates TypeScript usage
 */
export function hasTypeScript(packageJson?: PackageJson): boolean {
  return hasDependency(packageJson, FRAMEWORK_PATTERNS.typescript);
}