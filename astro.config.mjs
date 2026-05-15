import { defineConfig } from "astro/config";

export default defineConfig({
  outDir: "./dist/client",
  build: {
    assets: "assets"
  }
});
