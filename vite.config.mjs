import pkg from "./package.json" with { type: "json" };

import child_process from "node:child_process";
import path from "node:path";

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const commitHash = child_process
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

export default defineConfig({
  base: "./",
  build: {
    target: "chrome119",
    outDir: "./bundle",
    rollupOptions: {
      input: {
        "src/main.html": "src/main.html",
        "src/main_cordova.html": "src/main_cordova.html",
        "src/tabs/receiver_msp.html": "src/tabs/receiver_msp.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/d3")) {
            return "vendor-d3";
          }
          if (id.includes("node_modules/three")) {
            return "vendor-three";
          }
        },
      },
    },
  },
  plugins: [svelte()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BACKEND__: JSON.stringify("nwjs"),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  server: {
    port: 5077,
    strictPort: true,
  },
});
