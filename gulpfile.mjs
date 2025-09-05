import assert from "node:assert/strict";
import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import stream from "node:stream";

import archiver from "archiver";
import innoSetup from "@quanle94/innosetup";
import { sync as commandExistsSync } from "command-exists";
import cordovaPkg from "cordova-lib";
import { glob } from "glob";
import gulp from "gulp";
import deb from "gulp-debian";
import jeditor from "gulp-json-editor";
import rename from "gulp-rename";
import replace from "gulp-replace";
import logger from "gulplog";
import minimist from "minimist";
import nwbuild from "nw-builder";
import buildRpm from "rpm-builder";
import source from "vinyl-source-stream";
import * as vite from "vite";
import { VitePWA } from "vite-plugin-pwa";

import pkg from "./package.json" with { type: "json" };
// Replace dev mode paths
pkg.main = "index.html";
pkg.window.icon = "images/rf_icon.png";
delete pkg["node-remote"];

const { cordova } = cordovaPkg;

const argv = minimist(process.argv.slice(2));

const BUNDLE_DIR = "./bundle";
const APP_DIR = "./app";
const REDIST_DIR = "./redist";

const LINUX_INSTALL_DIR = "/opt/rotorflight";

const NWJS_CACHE_DIR = "nwjs_cache";
const NWJS_VERSION = "0.101.0";
const NWJS_ARCH = {
  x86: "ia32",
  x86_64: "x64",
  arm64: "arm64",
};
const NWJS_VERSION_MANIFEST = "https://nwjs.io/versions.json";

const context = {};
parseArgs();

export const app = build_app();
export const bundle = build_bundle();
export const redist = build_redist();
export const dev_client = run_dev_client();
export const debug = run_debug();

function clean_app() {
  return runAsync(fs.rm(APP_DIR, { recursive: true, force: true }));
}

function clean_bundle() {
  return runAsync(fs.rm(BUNDLE_DIR, { recursive: true, force: true }));
}

function clean_redist() {
  return runAsync(fs.rm(REDIST_DIR, { recursive: true, force: true }));
}

function build_bundle() {
  return gulp.series(clean_bundle, bundle_vite, bundle_src, bundle_deps);
}

function platform_backend() {
  return (
    {
      android: "cordova",
      pwa: "browser",
    }[context.target.platform] || "nwjs"
  );
}

function bundle_vite() {
  return runAsync(
    vite.build({
      define: { __BACKEND__: JSON.stringify(platform_backend()) },
      ...(context.vite_options || {}),
    }),
  );
}

function bundle_src() {
  const distSources = [
    "./src/tabs/**/*.html",
    "!./src/tabs/map.html",
    "!./src/tabs/receiver_msp.html",
  ];
  const packageJson = new stream.Readable();
  packageJson.push(JSON.stringify(pkg, undefined, 2));
  packageJson.push(null);

  return packageJson
    .pipe(source("package.json"))
    .pipe(gulp.src(distSources, { base: "." }))
    .pipe(gulp.src("pnpm-lock.yaml"))
    .pipe(gulp.dest(BUNDLE_DIR));
}

function bundle_deps() {
  return runAsync(
    new Promise((resolve, reject) =>
      child_process.exec(
        "pnpm install --prod --frozen-lockfile --node-linker=hoisted",
        { cwd: BUNDLE_DIR },
        (err) => (err ? reject(err) : resolve()),
      ),
    ),
  );
}

function build_app_browser() {
  return async () => {};
}

function pwa_vite_options() {
  return {
    build: {
      target: "esnext",
    },
    plugins: [
      VitePWA({
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        },
        registerType: "autoUpdate",
        manifest: {
          name: pkg.productName,
          short_name: "RotFliConfig",
          background_color: "#2e2e2e",
          theme_color: "#4da8da",
          start_url: "/",
          display: "standalone",
          icons: [
            {
              src: "/images/rf_icon.png",
              sizes: "256x256",
              type: "image/png",
              purpose: "maskable any",
            },
          ],
        },
      }),
    ],
  };
}

function backend_build_helpers(backend) {
  return {
    browser: function helper_build_app_browser() {
      context.vite_options = pwa_vite_options();
      const tasks = [build_bundle(), build_app_browser()];

      return gulp.series(tasks);
    },

    cordova: function helper_build_app_cordova() {
      context.appdir = `${APP_DIR}/${context.target.platform}`;

      return gulp.series(
        build_bundle(),
        cordova_copy_www,
        cordova_resources,
        cordova_include_www,
        cordova_copy_src,
        cordova_rename_src_config,
        cordova_rename_src_package,
        cordova_packagejson,
        cordova_configxml,
        cordova_deps,
        cordova_build,
      );
    },

    nwjs: function helper_build_app_nwjs() {
      const tasks = [build_bundle(), build_app_nwjs];

      switch (context.target.platform) {
        case "linux":
          tasks.push(build_nwjs_unix_permissions);
          tasks.push(build_nwjs_linux_assets);
          break;

        case "osx":
          tasks.push(build_nwjs_unix_permissions);
          break;
      }

      return gulp.series(tasks);
    },
  }[backend];
}

function build_app() {
  const build_helper = backend_build_helpers(platform_backend());
  assert(build_helper, `no build helper for backend ${platform_backend()}`);
  return gulp.series(clean_app, build_helper());
}

function build_app_nwjs() {
  const { platform, arch, flavor } = context.target;
  context.appdir = `${APP_DIR}/${platform}_${arch}`;

  const platformOpts = {
    osx: {
      icon: "./src/images/rf_icon.icns",
      CFBundleDisplayName: "Rotorflight Configurator",
    },
    win: {
      icon: "./src/images/rf_icon.ico",
    },
  };

  return runAsync(
    nwbuild({
      platform,
      arch: NWJS_ARCH[arch],
      outDir: context.appdir,
      flavor: flavor === "debug" ? "sdk" : "normal",
      app: platformOpts[platform],
      version: NWJS_VERSION,
      cacheDir: NWJS_CACHE_DIR,
      glob: false,
      srcDir: BUNDLE_DIR,
      manifestUrl: NWJS_VERSION_MANIFEST,
    }),
  );
}

function build_nwjs_linux_assets() {
  return gulp.src("assets/linux/**").pipe(gulp.dest(context.appdir));
}

/**
 * Nw.js archives do not have any permissions set for group and other.
 * Apply the correct permissions.
 */
async function build_nwjs_unix_permissions() {
  return runAsync(async () => {
    const ignore = [
      // bundle - linux
      `${context.appdir}/package.nw/**/*`,
      // bundle - osx
      `${context.appdir}/${pkg.name}.app/Contents/Resources/app.nw/**/*`,
    ];

    const dirs = await glob(`${context.appdir}/**/*/`, { ignore });
    for (const dir of dirs) {
      await fs.chmod(dir, 0o755);
    }

    const files = await glob(`${context.appdir}/**/*`, { nodir: true, ignore });
    for (const file of files) {
      let mode = 0o644;

      const stats = await fs.stat(file);
      if (stats.mode & fs.constants.S_IXUSR) {
        mode |=
          fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH;
      }

      await fs.chmod(file, mode);
    }
  });
}

function build_redist() {
  const redist_helper = helper_build_redist();
  assert(
    redist_helper,
    `no redist helper for platform ${context.target.platform}`,
  );
  return gulp.series(clean_redist, build_app(), mkdir_redist, redist_helper);
}

function mkdir_redist() {
  return runAsync(fs.mkdir(REDIST_DIR, { recursive: true }));
}

function helper_build_redist() {
  switch (context.target.platform) {
    case "linux":
      return build_redist_linux();

    case "osx":
      return build_redist_osx();

    case "win":
      return build_redist_win();

    case "android":
      return build_redist_apk();

    case "pwa":
      return build_redist_pwa();

    default:
      return () => {};
  }
}

function build_redist_pwa() {
  return () => () => Promise.reject(new Error("Not implemented"));
}

function build_redist_linux() {
  return gulp.parallel(build_redist_tar_xz, build_redist_deb, build_redist_rpm);
}

function build_redist_tar_xz() {
  const { platform, arch } = context.target;

  const filename = `${pkg.name}_${pkg.version}_${platform}_${arch}.tar.xz`;
  const output = `${path.relative(context.appdir, REDIST_DIR)}/${filename}`;
  const command = `tar -cJf '${output}' --transform 's|^\\./|rotorflight-configurator-${pkg.version}/|' .`;

  return runAsync(
    new Promise((resolve, reject) =>
      child_process.exec(command, { cwd: context.appdir }, (err) =>
        err ? reject(err) : resolve(),
      ),
    ),
  );
}

function build_redist_deb(done) {
  const { arch } = context.target;

  if (!commandExistsSync("dpkg-deb")) {
    logger.warn(
      `dpkg-deb command not found, not generating deb package for ${arch}`,
    );
    done();
    return;
  }

  const archmap = {
    x86: "i386",
    x86_64: "amd64",
    arm64: "arm64",
  };

  return gulp.src([`${context.appdir}/*`]).pipe(
    deb({
      package: pkg.name,
      version: pkg.version,
      section: "base",
      priority: "optional",
      architecture: archmap[arch],
      maintainer: pkg.author,
      description: pkg.description,
      preinst: [`rm -rf ${LINUX_INSTALL_DIR}/${pkg.name}`],
      postinst: [
        `chown root:root ${LINUX_INSTALL_DIR}`,
        `chown -R root:root ${LINUX_INSTALL_DIR}/${pkg.name}`,
        `xdg-desktop-menu install ${LINUX_INSTALL_DIR}/${pkg.name}/${pkg.name}.desktop`,
      ],
      prerm: [`xdg-desktop-menu uninstall ${pkg.name}.desktop`],
      changelog: [],
      _target: `${LINUX_INSTALL_DIR}/${pkg.name}`,
      _out: REDIST_DIR,
      _copyright: "assets/linux/copyright",
      _clean: true,
    }),
  );
}

function build_redist_rpm() {
  const { arch } = context.target;

  if (!commandExistsSync("rpmbuild")) {
    console.warn(
      `rpmbuild command not found, not generating rpm package for ${arch}`,
    );
    return;
  }

  const regex = /-/g;

  const archmap = {
    x86: "i386",
    x86_64: "x86_64",
    arm64: "aarch64",
  };

  const options = {
    name: pkg.name,
    version: pkg.version.replace(regex, "_"), // RPM does not like release candidate versions
    buildArch: archmap[arch],
    vendor: pkg.author,
    summary: pkg.description,
    license: "GNU General Public License v3.0",
    prefix: "/opt",
    files: [
      {
        cwd: context.appdir,
        src: "*",
        dest: `${LINUX_INSTALL_DIR}/${pkg.name}`,
      },
    ],
    postInstallScript: [
      `xdg-desktop-menu install ${LINUX_INSTALL_DIR}/${pkg.name}/${pkg.name}.desktop`,
    ],
    preUninstallScript: [`xdg-desktop-menu uninstall ${pkg.name}.desktop`],
    tempDir: `${REDIST_DIR}/tmp-rpm-build-${arch}`,
    keepTemp: false,
    verbose: false,
    rpmDest: REDIST_DIR,
    execOpts: { maxBuffer: 1024 * 1024 * 16 },
  };

  return runAsync(
    new Promise((resolve, reject) =>
      buildRpm(options, (err) => (err ? reject(err) : resolve())),
    ),
  );
}

function build_redist_osx() {
  return () =>
    runAsync(async () => {
      const appdmg = (await import("appdmg")).default;

      const targetPath = `${REDIST_DIR}/${pkg.name}_${pkg.version}_macos_${context.target.arch}.dmg`;

      await new Promise((resolve, reject) => {
        const builder = appdmg({
          target: targetPath,
          basepath: context.appdir,
          specification: {
            title: "Rotorflight Configurator",
            contents: [
              { x: 448, y: 342, type: "link", path: "/Applications" },
              {
                x: 192,
                y: 344,
                type: "file",
                path: `${pkg.name}.app`,
                name: "Rotorflight Configurator.app",
              },
            ],
            background: `${import.meta.dirname}/assets/osx/dmg-background.png`,
            format: "UDZO",
            window: {
              size: {
                width: 638,
                height: 479,
              },
            },
          },
        });

        builder.on("progress", (info) =>
          logger.info(
            info.current +
              "/" +
              info.total +
              " " +
              info.type +
              " " +
              (info.title || info.status),
          ),
        );
        builder.on("error", reject);
        builder.on("finish", resolve);
      });
    });
}

function build_redist_win() {
  return gulp.parallel(build_redist_zip, build_redist_exe);
}

function build_redist_zip() {
  return runAsync(async () => {
    const targetPath = `${REDIST_DIR}/${pkg.name}_${pkg.version}_win_${context.target.arch}.zip`;
    const fd = await fs.open(targetPath, "w");
    const archive = archiver("zip");
    archive.pipe(fd.createWriteStream());
    archive.directory(context.appdir, `${pkg.name}-${pkg.version}`);
    await archive.finalize();
  });
}

function build_redist_exe() {
  const { arch } = context.target;

  const parameters = [
    // Extra parameters to replace inside the iss file
    `/Dversion=${pkg.version}`,
    `/DarchName=${arch}`,
    `/DarchAllowed=${arch === "x86" ? "x86 x64" : "x64"}`,
    `/DarchInstallIn64bit=${arch === "x86" ? "" : "x64"}`,
    `/DsourceFolder=${context.appdir}`,
    `/DtargetFolder=${REDIST_DIR}`,

    // Show only errors in console
    "/Q",

    // Script file to execute
    "assets/windows/installer.iss",
  ];

  return runAsync(
    new Promise((resolve, reject) =>
      innoSetup(parameters, {}, (err) => (err ? reject(err) : resolve())),
    ),
  );
}

function run_dev_client() {
  switch (context.target.platform) {
    case "android":
      return () =>
        runAsync(Promise.reject(Error("android dev client not supported")));

    case "linux":
    case "osx":
    case "win":
      return run_nwjs_dev_client;

    case "pwa":
      return run_browser_dev_client;
  }
}

async function set_debug_flavor() {
  context.target.flavor = "debug";
}

function backend_debug_tasks(backend) {
  return {
    nwjs: function run_debug_nwjs() {
      const exe = getNwjsExePath(context.target.platform);
      return new Promise((resolve, reject) =>
        child_process.execFile(`${context.appdir}/${exe}`, (err) =>
          err ? reject(err) : resolve(),
        ),
      );
    },

    cordova: function run_debug_cordova() {
      return runAsync(cordova.run());
    },

    browser: function run_debug_browser() {
      throw new Error("Not implemented yet");
    },
  }[backend];
}

function run_debug() {
  return gulp.series(
    set_debug_flavor,
    build_app(),
    backend_debug_tasks(platform_backend()),
  );
}

function getNwjsExePath(platform) {
  switch (platform) {
    case "linux":
      return pkg.name;
    case "win":
      return `${pkg.name}.exe`;
    case "osx":
      return `${pkg.name}.app/Contents/MacOS/nwjs`;

    default:
      throw new Error(`Unsupported NW.js platform: ${platform}`);
  }
}

async function run_browser_dev_client() {
  const server = await vite.createServer({
    ...pwa_vite_options(),
    define: { __BACKEND__: JSON.stringify("browser") },
    server: {
      port: 1337,
    },
  });
  await server.listen();

  server.printUrls();
  server.bindCLIShortcuts({ print: true });
}

function run_nwjs_dev_client() {
  const { platform, arch } = context.target;

  return runAsync(
    nwbuild({
      mode: "run",
      platform,
      arch: NWJS_ARCH[arch],
      flavor: "sdk",
      version: NWJS_VERSION,
      cacheDir: NWJS_CACHE_DIR,
      glob: false,
      srcDir: ".",
      manifestUrl: NWJS_VERSION_MANIFEST,
    }),
  );
}

function cordova_copy_www() {
  return gulp
    .src(`${BUNDLE_DIR}/**`, { base: BUNDLE_DIR, follow: true })
    .pipe(gulp.dest(`${context.appdir}/www/`));
}

function cordova_resources() {
  return gulp
    .src("assets/android/**")
    .pipe(gulp.dest(`${context.appdir}/resources/android/`));
}

function cordova_include_www() {
  return gulp
    .src(`${context.appdir}/www/index.html`)
    .pipe(
      replace(
        "<!-- CORDOVA_INCLUDE cordova.js -->",
        '<script type="text/javascript" src="/cordova.js"></script>',
      ),
    )
    .pipe(gulp.dest(`${context.appdir}/www/`));
}

function cordova_copy_src() {
  return gulp
    .src([
      `cordova/**`,
      `!cordova/config_template.xml`,
      `!cordova/package_template.json`,
    ])
    .pipe(gulp.dest(context.appdir));
}

function cordova_rename_src_config() {
  return gulp
    .src("cordova/config_template.xml")
    .pipe(rename("config.xml"))
    .pipe(gulp.dest(context.appdir));
}

function cordova_rename_src_package() {
  return gulp
    .src("cordova/package_template.json")
    .pipe(rename("package.json"))
    .pipe(gulp.dest(context.appdir));
}

function cordova_packagejson() {
  return gulp
    .src(`${context.appdir}/package.json`)
    .pipe(
      jeditor({
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        author: pkg.author,
        license: pkg.license,
      }),
    )
    .pipe(gulp.dest(context.appdir));
}

function cordova_configxml() {
  return gulp
    .src([`${context.appdir}/config.xml`])
    .pipe(replace("{{name}}", pkg.productName))
    .pipe(replace("{{description}}", pkg.description))
    .pipe(replace("{{author}}", pkg.author))
    .pipe(replace("{{version}}", pkg.version))
    .pipe(gulp.dest(context.appdir));
}

function cordova_deps() {
  return runAsync(
    new Promise((resolve, reject) =>
      child_process.exec(
        "pnpm install --prod --frozen-lockfile --node-linker=hoisted",
        { cwd: context.appdir },
        (err) => (err ? reject(err) : resolve()),
      ),
    ),
  );
}

function cordova_build() {
  return runAsync(async () => {
    const cwd = process.cwd();
    process.chdir(context.appdir);
    try {
      await cordova.platform("add", ["android"]);
      await cordova.build({
        platforms: ["android"],
        options: {
          release: context.target.flavor !== "debug",
          buildConfig: "build.json",
        },
      });
    } finally {
      process.chdir(cwd);
    }
  });
}

function build_redist_apk() {
  const { flavor } = context.target;
  const filename = `${pkg.name}_${pkg.version}_android.apk`;
  return () =>
    gulp
      .src(
        `${context.appdir}/platforms/android/app/build/outputs/apk/${flavor}/app-${flavor}.apk`,
      )
      .pipe(rename(filename))
      .pipe(gulp.dest(REDIST_DIR));
}

function parseArgs() {
  const platforms = ["linux", "osx", "win", "android", "pwa"];
  const arches = ["x86", "x86_64", "arm64"];

  const target = {
    platform: argv.platform ?? getHostPlatform(),
    arch: argv.arch ?? getHostArch(),
    flavor: argv.debug ? "debug" : "release",
  };

  if (target.platform) {
    assert(
      platforms.includes(target.platform),
      `unsupported platform: ${target.platform}`,
    );

    if (["android", "pwa"].includes(target.platform)) {
      target.arch = null;
    } else {
      assert(arches.includes(target.arch), `unsupported arch: ${target.arch}`);
    }
  }

  context.target = target;
}

function getHostPlatform() {
  return {
    linux: "linux",
    darwin: "osx",
    win32: "win",
  }[process.platform];
}

function getHostArch() {
  return {
    x64: "x86_64",
    arm64: "arm64",
    ia32: "x86",
  }[process.arch];
}

async function runAsync(fn) {
  try {
    await (typeof fn === "function" ? fn() : fn);
  } catch (err) {
    console.log(err);
    throw err;
  }
}
