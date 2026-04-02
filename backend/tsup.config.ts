import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  format: ["cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
});
