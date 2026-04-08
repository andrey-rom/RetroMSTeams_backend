import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
  // Bundle all node_modules into dist so the deployment is self-contained
  // (no node_modules needed on the server at runtime).
  noExternal: [/.*/],
  esbuildOptions(options) {
    // Prisma's generated client uses import.meta.url for __dirname resolution.
    // When tsup bundles to CJS, import.meta becomes {} and .url is undefined.
    // This banner+define restores a valid URL so fileURLToPath doesn't crash.
    options.define = {
      ...options.define,
      "import.meta.url": "__esm_import_meta_url__",
    };
    options.banner = {
      js: `const __esm_import_meta_url__ = require("url").pathToFileURL(__filename).href;`,
    };
  },
});
