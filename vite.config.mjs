import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

import pkg from "./package.json" with { type: "json" };

const commitHash = child_process
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

const buildLabel =
  process.env.VITE_APP_BUILD_LABEL ||
  child_process
    .execSync("git branch --show-current || git describe --tags --exact-match")
    .toString()
    .trim() ||
  commitHash;

// "nwjs" (desktop, the default), "cordova" (Android app) or "web" (a plain
// browser tab, deployed to GitHub Pages by .github/workflows/deploy-web.yml).
// gulpfile.mjs overrides __BACKEND__ for its own nwjs/cordova builds.
function getBackend() {
  const backend = process.env.VITE_APP_BACKEND || "nwjs";
  if (["nwjs", "cordova", "web"].includes(backend)) {
    return backend;
  }
  console.warn(`Unknown backend "${backend}", defaulting to "nwjs"`);
  return "nwjs";
}

const backend = getBackend();

// The web build is served from a sub-directory per deployed ref (e.g.
// /rotorflight-configurator/master/), so it needs an absolute base path.
// VITE_APP_BASE is the full path; VITE_APP_VERSION is kept as a shorthand
// for a site served from the domain root.
function getBasePath() {
  if (backend !== "web") {
    return "./";
  }
  let base =
    process.env.VITE_APP_BASE ||
    (process.env.VITE_APP_VERSION ? `/${process.env.VITE_APP_VERSION}/` : "/");
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

const basePath = getBasePath();

// Directories the app refers to by absolute URL (/images/..., /locales/...).
// NW.js serves the app from its own root so those resolve as-is; under a web
// sub-directory they have to be prefixed with the base path.
const publicAssetPrefixes = [
  "images",
  "locales",
  "libraries",
  "node_modules",
  "fontawesome",
  "fonts",
  "opensans_webfontkit",
  "resources",
];

// Classic (non-module) scripts index.html loads straight out of node_modules.
// Vite can't bundle them, and the desktop build gets them from a
// `pnpm install` inside bundle/ (see gulpfile.mjs), which a static site
// doesn't have -- so the web build copies them in instead.
const legacyBrowserScripts = [
  ["node_modules/lru_map/lru.js", "assets/vendor/lru.js"],
  ["node_modules/jquery/dist/jquery.min.js", "assets/vendor/jquery.min.js"],
  ["node_modules/jbox/dist/jBox.min.js", "assets/vendor/jBox.min.js"],
  [
    "node_modules/jquery-ui-npm/jquery-ui.min.js",
    "assets/vendor/jquery-ui.min.js",
  ],
  [
    "node_modules/switchery-latest/dist/switchery.min.js",
    "assets/vendor/switchery.min.js",
  ],
  [
    "node_modules/jquery-textcomplete/dist/jquery.textcomplete.min.js",
    "assets/vendor/jquery.textcomplete.min.js",
  ],
  [
    "node_modules/jquery-touchswipe/jquery.touchSwipe.min.js",
    "assets/vendor/jquery.touchSwipe.min.js",
  ],
  [
    "node_modules/select2/dist/js/select2.min.js",
    "assets/vendor/select2.min.js",
  ],
];

// public/ entries that are symlinks (or, for fontawesome, a git-ignored copy
// made on developer machines). Copied into the web bundle with the links
// dereferenced so a fresh CI checkout produces a complete site.
const publicCopyTargets = [
  ["images", "src/images"],
  ["libraries", "libraries"],
  ["locales", "locales"],
  ["resources", "resources"],
  ["fontawesome", "node_modules/@fortawesome/fontawesome-free"],
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewritePublicAssetUrls(content) {
  if (basePath === "/") {
    return content;
  }
  return publicAssetPrefixes.reduce((result, prefix) => {
    // Only where the path starts a URL. Anything in front of the slash (a
    // path segment, a host) means it is already prefixed -- Vite does that
    // for the URLs it resolves itself -- or isn't one of ours.
    const matcher = new RegExp(`(?<![\\w.%/-])/${escapeRegExp(prefix)}/`, "g");
    return result.replace(matcher, `${basePath}${prefix}/`);
  }, content);
}

function rewriteLegacyBrowserScriptUrls(content) {
  return legacyBrowserScripts.reduce(
    (result, [from, to]) =>
      result.replaceAll(`${basePath}${from}`, `${basePath}${to}`),
    content,
  );
}

// CSS inlined into HTML as a data: URI isn't visible to the text rewrite.
function rewriteInlineCssDataUris(html) {
  return html.replace(
    /data:text\/css;base64,([A-Za-z0-9+/=]+)/g,
    (_, encoded) =>
      `data:text/css;base64,${Buffer.from(
        rewritePublicAssetUrls(Buffer.from(encoded, "base64").toString("utf8")),
        "utf8",
      ).toString("base64")}`,
  );
}

function webBuildPlugins() {
  if (backend !== "web") {
    return [];
  }

  return [
    {
      name: "web-copy-public-targets",
      apply: "build",
      async writeBundle() {
        await Promise.all(
          publicCopyTargets.map(async ([publicPath, sourcePath]) => {
            const source = path.resolve(sourcePath);
            try {
              if (!(await fs.stat(source)).isDirectory()) return;
            } catch {
              return;
            }
            const target = path.resolve("bundle", publicPath);
            await fs.rm(target, { force: true, recursive: true });
            await fs.cp(source, target, { dereference: true, recursive: true });
          }),
        );
      },
    },
    {
      name: "web-copy-legacy-scripts",
      apply: "build",
      async writeBundle() {
        await Promise.all(
          legacyBrowserScripts.map(async ([source, target]) => {
            const targetFile = path.resolve("bundle", target);
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            await fs.copyFile(path.resolve(source), targetFile);
          }),
        );
      },
    },
    {
      name: "web-stamp-service-worker",
      apply: "build",
      async writeBundle() {
        const file = path.resolve("bundle", "service-worker.js");
        try {
          const text = await fs.readFile(file, "utf8");
          await fs.writeFile(
            file,
            text
              .replaceAll("__APP_VERSION__", pkg.version)
              .replaceAll("__COMMIT_HASH__", commitHash),
          );
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      },
    },
    {
      name: "web-rewrite-public-asset-urls",
      apply: "build",
      async writeBundle(_, bundle) {
        await Promise.all(
          Object.values(bundle).map(async (output) => {
            if (!/\.(html|css|js)$/.test(output.fileName)) {
              return;
            }
            const file = path.resolve("bundle", output.fileName);
            const original = await fs.readFile(file, "utf8");
            let content = rewriteLegacyBrowserScriptUrls(
              rewritePublicAssetUrls(original),
            );
            if (output.fileName.endsWith(".html")) {
              content = rewriteInlineCssDataUris(content);
            }
            if (content !== original) {
              await fs.writeFile(file, content);
            }
          }),
        );
      },
    },
  ];
}

export default defineConfig({
  base: basePath,
  build: {
    target: "chrome119",
    outDir: "./bundle",
    chunkSizeWarningLimit: 1024 * 1024,
    rollupOptions: {
      input: {
        "index.html": "index.html",
        "src/main_cordova.html": "src/main_cordova.html",
        "src/tabs/receiver_msp.html": "src/tabs/receiver_msp.html",
        "src/tabs/map.html": "src/tabs/map.html",
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
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
  plugins: [
    svelte(),
    {
      name: "locale-watch",
      configureServer(server) {
        server.watcher.on("change", (file) => {
          const relative = path.relative(server.config.root, file);
          const match = relative.match(
            /^public\/locales\/(.+)\/messages.json$/,
          );
          if (match) {
            server.ws.send("locale-change", match[1]);
          }
        });
      },
    },
    ...webBuildPlugins(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        additionalData: '@use "@/css/mixins.scss";\n',
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BACKEND__: JSON.stringify(backend),
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_LABEL__: JSON.stringify(buildLabel),
  },
  server: {
    port: 5077,
    strictPort: true,
  },
});
