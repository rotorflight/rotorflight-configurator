## Setup

1. Install Node.js `nvm install`
2. Install pnpm `npm install -g pnpm`
3. Install dependencies `make init`

## Development

### Desktop

1. Start the dev server `make dev-server`
2. Run `make dev-client`

**Note:** The NW.js SDK needs to be downloaded the first time `make dev-client` runs, and may take some time to complete.

### Android

Developing for Android requires JDK 11, gradle, and Android SDK 33.

1. Start an Android emulator or connect a physical device with debugging enabled
2. Set a version for the application `SEMVER=2.1.0-dev make version`
3. Run `make android`
4. Open `chrome://inspect/#devices` in a Chrome browser to debug

## Building

Tasks are defined in `gulpfile.mjs` and can be run with pnpm.

```
pnpm gulp <task> [--debug] [--platform <platform>] [--arch <arch>]
```

**`<task>`**

- **`bundle`** bundles the source files into `./bundle`.
- **`app`** builds the application in `./app`.
- **`redist`** creates redistributable archives in `./redist`.

**`--debug`** Outputs builds that can be debugged with Chrome DevTools or an Android debugger.

**`<platform>`** Defaults to the host platform.

- linux
- osx
- win
- android

**`<arch>`** Defaults to the host architecture.

- x86
- x86_64
- arm64
