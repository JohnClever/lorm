import { defineConfig } from 'tsup';

export const createTsupConfig = (options: {
  entry?: string[] | Record<string, string>;
  external?: string[];
  banner?: { js?: string };
}) => {
  return defineConfig({
    entry: options.entry || ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: 'es2020',
    outDir: 'dist',
    external: options.external || [],
    esbuildOptions(esbuildOptions) {
      if (options.banner) {
        esbuildOptions.banner = options.banner;
      }
    },
  });
};