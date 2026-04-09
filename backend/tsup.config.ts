import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "prisma/seed.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
  esbuildOptions(options) {
    // Prisma's generated client uses import.meta.url for __dirname resolution.
    // tsup compiles to CJS where import.meta becomes {} — .url is undefined.
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
