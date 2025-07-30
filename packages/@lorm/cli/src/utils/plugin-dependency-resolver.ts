import chalk from "chalk";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

export interface PluginDependency {
  name: string;
  version: string;
  optional?: boolean;
  peer?: boolean;
}

export interface PluginManifest {
  name: string;
  version: string;
  dependencies?: PluginDependency[];
  peerDependencies?: PluginDependency[];
  conflicts?: string[];
  engines?: {
    node?: string;
    lorm?: string;
  };
}

export interface DependencyResolutionResult {
  resolved: string[];
  missing: PluginDependency[];
  conflicts: Array<{
    plugin: string;
    conflictsWith: string;
  }>;
  loadOrder: string[];
}

export class PluginDependencyResolver {
  private manifests = new Map<string, PluginManifest>();
  private dependencyGraph = new Map<string, Set<string>>();

  loadManifest(pluginPath: string): PluginManifest | null {
    try {
      const manifestPath = resolve(pluginPath, "plugin.json");
      if (!existsSync(manifestPath)) {
        return null;
      }

      const manifestContent = readFileSync(manifestPath, "utf8");
      const manifest: PluginManifest = JSON.parse(manifestContent);

      this.manifests.set(manifest.name, manifest);
      return manifest;
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Failed to load plugin manifest: ${error}`)
      );
      return null;
    }
  }

  resolveDependencies(pluginNames: string[]): DependencyResolutionResult {
    const resolved: string[] = [];
    const missing: PluginDependency[] = [];
    const conflicts: Array<{ plugin: string; conflictsWith: string }> = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    this.buildDependencyGraph();

    this.detectConflicts(pluginNames, conflicts);

    for (const pluginName of pluginNames) {
      this.resolveDependenciesRecursive(
        pluginName,
        resolved,
        missing,
        visited,
        visiting
      );
    }

    const loadOrder = this.topologicalSort(resolved);

    return {
      resolved,
      missing,
      conflicts,
      loadOrder,
    };
  }

  validateCompatibility(pluginName: string): {
    compatible: boolean;
    issues: string[];
  } {
    const manifest = this.manifests.get(pluginName);
    const issues: string[] = [];

    if (!manifest) {
      return {
        compatible: false,
        issues: ["Plugin manifest not found"],
      };
    }

    if (manifest.engines?.node) {
      const nodeVersion = process.version;
      if (!this.satisfiesVersion(nodeVersion, manifest.engines.node)) {
        issues.push(
          `Requires Node.js ${manifest.engines.node}, but running ${nodeVersion}`
        );
      }
    }

    if (manifest.engines?.lorm) {
      // This would need to be passed in or retrieved from package.json
      // For now, we'll skip this check
    }

    return {
      compatible: issues.length === 0,
      issues,
    };
  }

  private buildDependencyGraph(): void {
    this.dependencyGraph.clear();

    for (const [pluginName, manifest] of this.manifests.entries()) {
      const dependencies = new Set<string>();

      if (manifest.dependencies) {
        manifest.dependencies.forEach((dep) => {
          if (!dep.optional) {
            dependencies.add(dep.name);
          }
        });
      }

      this.dependencyGraph.set(pluginName, dependencies);
    }
  }

  private detectConflicts(
    pluginNames: string[],
    conflicts: Array<{ plugin: string; conflictsWith: string }>
  ): void {
    for (const pluginName of pluginNames) {
      const manifest = this.manifests.get(pluginName);
      if (!manifest?.conflicts) continue;

      for (const conflictingPlugin of manifest.conflicts) {
        if (pluginNames.includes(conflictingPlugin)) {
          conflicts.push({
            plugin: pluginName,
            conflictsWith: conflictingPlugin,
          });
        }
      }
    }
  }

  private resolveDependenciesRecursive(
    pluginName: string,
    resolved: string[],
    missing: PluginDependency[],
    visited: Set<string>,
    visiting: Set<string>
  ): void {
    if (visited.has(pluginName)) {
      return;
    }

    if (visiting.has(pluginName)) {
      console.warn(
        chalk.yellow(`⚠️  Circular dependency detected: ${pluginName}`)
      );
      return;
    }

    visiting.add(pluginName);
    const manifest = this.manifests.get(pluginName);

    if (!manifest) {
      missing.push({ name: pluginName, version: "*" });
      visiting.delete(pluginName);
      return;
    }

    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!dep.optional) {
          this.resolveDependenciesRecursive(
            dep.name,
            resolved,
            missing,
            visited,
            visiting
          );
        }
      }
    }

    visiting.delete(pluginName);
    visited.add(pluginName);

    if (!resolved.includes(pluginName)) {
      resolved.push(pluginName);
    }
  }

  private topologicalSort(plugins: string[]): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (plugin: string): void => {
      if (temp.has(plugin)) {
        throw new Error(`Circular dependency detected: ${plugin}`);
      }
      if (visited.has(plugin)) {
        return;
      }

      temp.add(plugin);
      const dependencies = this.dependencyGraph.get(plugin) || new Set();

      for (const dep of dependencies) {
        if (plugins.includes(dep)) {
          visit(dep);
        }
      }

      temp.delete(plugin);
      visited.add(plugin);
      result.push(plugin);
    };

    for (const plugin of plugins) {
      if (!visited.has(plugin)) {
        visit(plugin);
      }
    }

    return result;
  }

  private satisfiesVersion(actual: string, required: string): boolean {
    const actualParts = actual.replace("v", "").split(".").map(Number);
    const requiredParts = required
      .replace(/[^\d.]/g, "")
      .split(".")
      .map(Number);

    for (
      let i = 0;
      i < Math.max(actualParts.length, requiredParts.length);
      i++
    ) {
      const actualPart = actualParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (actualPart < requiredPart) {
        return false;
      }
      if (actualPart > requiredPart) {
        return true;
      }
    }

    return true;
  }
}

export const pluginDependencyResolver = new PluginDependencyResolver();
