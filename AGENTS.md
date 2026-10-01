# Agent notes

## Never bump version numbers

Agents must not change version numbers. The maintainers bump them manually
when a new version is released. This keeps version changes to a minimum.

Do not touch:

- the `API_VERSION_*` constants, `API_VERSION_RTFL_MIN` or
  `API_VERSION_RTFL_MAX` in `src/js/configurator.svelte.js`,
- the Virtual firmware versions in `virtualFirmwareVersions`
  (`src/js/utils/common.js`),
- `version` in `package.json`.

Gate new MSP fields on the constant for the upcoming, not yet released API
version. If no such constant exists yet, say so in the PR instead of adding
one.

## Keep the virtual FC in sync with the firmware

The "Virtual" port connects to a simulated flight controller implemented in
[`src/js/virtual_fc.js`](src/js/virtual_fc.js). In virtual mode no bytes go
over the wire: `MSP.send_message` hands every request to
`handleVirtualMessage()`, and the tabs read whatever `applyVirtualConfig()`
put into `FC`. Nothing fails loudly when the two drift apart, so update the
virtual FC in the same change whenever you touch MSP.

[rotorflight-firmware](https://github.com/rotorflight/rotorflight-firmware) is
the source of truth: `src/main/msp/msp.c` for payloads and side effects, and
`src/main/pg/*.c` for defaults and array sizes.

When you:

- **Add or change a field parsed in `MSPHelper.process_data`**, give it a
  firmware default in `applyVirtualConfig()`, in the units the parser
  produces. Arrays must have the length the firmware reports (for example 29
  mixer inputs, 32 LEDs, 20 mode ranges, 3×16 RPM notches).
- **Add a caller that reads the reply payload** (`response.data`, or
  `const { data } = await MSP.promise(...)`), return a firmware-format
  payload for that code from `handleVirtualMessage()`.
- **Add a command with firmware side effects** beyond storing what `FC`
  already holds (profile select/copy/reset, erase, arming, reset to
  defaults, …), mirror that behaviour in `handleVirtualMessage()`.
- **Add a version-dependent field** (`semver.gte(FC.CONFIG.apiVersion, …)`),
  make sure the virtual FC is still correct for every API version in the
  Virtual firmware dropdown (`virtualFirmwareVersions` in
  `src/js/utils/common.js`).
- **Add a flight mode, feature-gated box, or MSP constant** (profile counts,
  arming flags, debug modes), update the matching table or constant at the
  top of `virtual_fc.js`.
