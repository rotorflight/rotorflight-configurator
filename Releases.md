# 2.1.0-20240828

This is a _development snapshot_ of the Rotorflight 2.1 Configurator.

## Notes

This version is intended to be used for beta-testing only.
It is not fully working nor stable, and should not be used by end-users.

For more information, please join the Rotorflight Discord chat.

## Downloads

The download locations are:

- [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases/tag/snapshot/2.1.0-20240828)
- [Rotorflight Blackbox](https://github.com/rotorflight/rotorflight-blackbox/releases/tag/snapshot/2.1.0-20240828)
- [LUA Scripts for EdgeTx and OpenTx](https://github.com/rotorflight/rotorflight-lua-scripts/releases/tag/snapshot/2.1.0-20240828)
- [LUA Scripts for FrSky Ethos](https://github.com/rotorflight/rotorflight-lua-ethos/releases/tag/snapshot/2.1.0-20240828)


## Changes

- Backwards compatibility with RF 2.0
- Custom CRSF/ELRS telemetry support
- Automatic board detection in Firmware Flasher
- Cyclic Cross-Coupling cutoff scaling added
- Acc trim adjustments added
- ESC BB log options added
- SBUS2 protocol added
- Pinswap config added
- Improved ctrl-mouse zoom
- Accept 4.4.x firmware


***

# 2.0.0

This is the _first official_ Release of the Rotorflight-2 Configurator.

## Downloads

The download locations for Rotorflight 2.0.0 are:

- [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases/tag/release/2.0.0)
- [Rotorflight Blackbox](https://github.com/rotorflight/rotorflight-blackbox/releases/tag/release/2.0.0)
- [LUA Scripts for EdgeTx and OpenTx](https://github.com/rotorflight/rotorflight-lua-scripts/releases/tag/release/2.0.0)
- [LUA Scripts for FrSky Ethos](https://github.com/rotorflight/rotorflight-lua-ethos/releases/tag/release/2.0.0)


## Notes

1. There is a new website [www.rotorflight.org](https://www.rotorflight.org/) for Rotorflight-2. The old Wiki in github is deprecated, and is for Rotorflight-1 only. Big thanks to the documentation team for setting this up!

2. Rotorflight-2 is **NOT** backward compatible with RF1. You **MUST NOT** load your configuration dump from RF1 into RF2.

3. If coming from RF1, please setup your helicopter from scratch for RF2. Follow the instructions on the website!

4. As always, please double check your configuration on the bench before flying!


## Support

The main source of Rotorflight information and instructions is now the [website](https://www.rotorflight.org/).

Rotorflight has a strong presence on the Discord platform - you can join us [here](https://discord.gg/FyfMF4RwSA/).
Discord is the primary location for support, questions and discussions. The developers are all active there,
and so are the manufacturers of RF Flight Controllers. Many pro pilots are also there.
This is a great place to ask for advice or discuss any complicated problems or even new ideas.

There is also a [Rotorflight Facebook Group](https://www.facebook.com/groups/rotorflight) for hanging out with other Rotorflight pilots.


## Changes

RF2 is built on Betaflight 4.3, and is rewritten from ground up, with the experience learned from Rotorflight-1.

Lots of things have changed in the two years of development. A full changelog can be found in
[git](https://github.com/rotorflight/rotorflight-configurator/commits/RF-2.0.x/).

### Changes since 2.0.0-RC3

- Update translated locales
- Fix reset default values in Rates


***

# 2.0.0-RC3

This is the _third_ Release Candidate of the Rotorflight-2 Configurator.

## Downloads

The official download locations for Rotorflight 2.0.0-RC3 are:

- [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases/tag/release/2.0.0-RC3)
- [Rotorflight Blackbox](https://github.com/rotorflight/rotorflight-blackbox/releases/tag/release/2.0.0-RC3)
- [LUA Scripts for EdgeTx and OpenTx](https://github.com/rotorflight/rotorflight-lua-scripts/releases/tag/release/2.0.0-RC3)
- [LUA Scripts for FrSky Ethos](https://github.com/rotorflight/rotorflight-lua-ethos/releases/tag/release/2.0.0-RC3)


## Notes

1. There is a new website [www.rotorflight.org](https://www.rotorflight.org/) for Rotorflight-2. The old Wiki in github is deprecated, and is for Rotorflight-1 only. Big thanks to the documentation team for setting this up!

2. Rotorflight-2 is **NOT** backward compatible with RF1. You **MUST NOT** load your configuration dump from RF1 into RF2.

3. If coming from RF1, please setup your helicopter from scratch for RF2. Follow the instructions on the website!

4. As always, please double check your configuration on the bench before flying!


## Support

The main source of Rotorflight information and instructions is now the [website](https://www.rotorflight.org/).

Rotorflight has a strong presence on the Discord platform - you can join us [here](https://discord.gg/FyfMF4RwSA/).
Discord is the primary location for support, questions and discussions. The developers are all active there,
and so are the manufacturers of RF Flight Controllers. Many pro pilots are also there.
This is a great place to ask for advice or discuss any complicated problems or even new ideas.

There is also a [Rotorflight Facebook Group](https://www.facebook.com/groups/876445460825093) for hanging out with other Rotorflight pilots.


## Changes

RF2 is built on Betaflight 4.3, and is rewritten from ground up, with the experience learned from Rotorflight-1.

Lots of things have changed in the two years of development. A full changelog can be found in
[git](https://github.com/rotorflight/rotorflight-configurator/commits/RF-2.0.x/).

### Changes since 2.0.0-RC2

- Add cyclic decay parameters to Profiles
- Fix saving default Profile and Rates Profile
- Fix output throttle PWM limits
- Extend governor max throttle range to 0..100%
- Extend rescue rate limit to 1000
- Show PID gain help icons
- Disable unavailable telemetry protocols in ESC telemetry dropdown
- New Donate button that works also in China
- Update translated locales


***

# 2.0.0-RC2

This is the _second_ Release Candidate of the Rotorflight-2 Configurator.

## Downloads

The official download locations for Rotorflight 2.0.0-RC2 are:

- [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases/tag/release/2.0.0-RC2)
- [Rotorflight Blackbox](https://github.com/rotorflight/rotorflight-blackbox/releases/tag/release/2.0.0-RC2)
- [LUA Scripts for EdgeTx and OpenTx](https://github.com/rotorflight/rotorflight-lua-scripts/releases/tag/release/2.0.0-RC2)
- [LUA Scripts for FrSky Ethos](https://github.com/rotorflight/rotorflight-lua-ethos/releases/tag/release/2.0.0-RC2)


## Notes

1. There is a new website [www.rotorflight.org](https://www.rotorflight.org/) for Rotorflight-2. The old Wiki in github is deprecated, and is for Rotorflight-1 only. Big thanks to the documentation team for setting this up!

1. Rotorflight-2 is **NOT** backward compatible with RF1. You **MUST NOT** load your configuration dump from RF1 into RF2.

1. If coming from RF1, please setup your helicopter from scratch for RF2. Follow the instructions on the website!

1. As always, please double check your configuration on the bench before flying!


## Support

The main source of Rotorflight information and instructions is now the [website](https://www.rotorflight.org/).

Rotorflight has a strong presence on the Discord platform - you can join us [here](https://discord.gg/FyfMF4RwSA/).
Discord is the primary location for support, questions and discussions. The developers are all active there,
and so are the manufacturers of RF Flight Controllers. Many pro pilots are also there.
This is a great place to ask for advice or discuss any complicated problems or even new ideas.

There is also a [Rotorflight Facebook Group](https://www.facebook.com/groups/876445460825093) for hanging out with other Rotorflight pilots.


## Changes

RF2 is built on Betaflight 4.3, and is rewritten from ground up, with the experience learned from Rotorflight-1.

Lots of things have changed in the two years of development. A full changelog can be found online later.

### Changes since 2.0.0-RC1

- Accept all MSP compatible firmware
- Extend yaw Mixer override to -60°..60°
- Adjust RPM filter defaults
- Add GOV_MODE to FrSky telemetry sensors
- Fix top bar battery gadget to show battery info from the FC
- Update links to point to [www.rotorflight.org](https://www.rotorflight.org/)
- Add a notice for Configurator development versions
- Update english messages
- Update translations (de,nl,fr)
- Hide untranslated locales
- Update startup page
- Add Donation info
- Hide builtin ChangeLog
- Update README.md and HOWTO.md
- Remove old NSIS installer

***

# 2.0.0-RC1

This is the first Release Candidate of the Rotorflight 2 Configurator.

## Downloads

The official download locations for Rotorflight 2.0.0-RC1 are:

- [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases/tag/release/2.0.0-RC1)
- [Rotorflight Blackbox](https://github.com/rotorflight/rotorflight-blackbox/releases/tag/release/2.0.0-RC1)
- [LUA Scripts for EdgeTx](https://github.com/rotorflight/rotorflight-lua-scripts/releases/tag/release/2.0.0-RC1)
- [LUA Scripts for Ethos](https://github.com/rotorflight/rotorflight-lua-ethos/releases/tag/release/2.0.0-RC1)


## Notes

1. There is a new website [www.rotorflight.org](https://www.rotorflight.org/) for Rotorflight 2.
   The old Wiki in github is deprecated, and is for Rotorflight-1 only.
   Big thanks to the documentation team for setting this up!

1. Rotorflight 2 is **NOT** backward compatible with RF1. You **MUST NOT** load your configuration dump from RF1 into RF2.

1. If coming from RF1, please setup your helicopter from scratch for RF2. Follow the instructions on the website!

1. As always, please double check your configuration on the bench before flying!


## Support

The main source of Rotorflight information and instructions is now the [website](https://www.rotorflight.org/).

Rotorflight has a strong presence on the Discord platform - you can join us [here](https://discord.gg/FyfMF4RwSA/).
Discord is the primary location for support, questions and discussions. The developers are all active there,
and so are the manufacturers of RF Flight Controllers. Many pro pilots are also there.
This is a great place to ask for advice or discuss any complicated problems or even new ideas.

There is also a [Rotorflight Facebook Group](https://www.facebook.com/groups/876445460825093) for hanging out with other Rotorflight pilots.


## Changes

RF2 is based on Betaflight 4.3.x, and is rewritten from ground up, with the experience learned from Rotorflight-1.

Lots of things have changed in the two years of development. A full changelog can be found online later.

### Changes since 2.0.0-20240218

- Fix Zoom function
- Relax servo rate limits
- Refactor MSP_SERVO_CONFIGURATIONS
- Change default channel order to AECR1T23
- Add vendor names in receiver protocols
- Many fixes in labels and help texts
- Update locales for translation
