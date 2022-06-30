This is an official release of **Rotorflight Configurator**.

**Rotorflight** is a Flight Control/FBL Software Suite for traditional single-rotor RC helicopters. It is based on Betaflight 4.2, enjoying all the great features of the Betaflight platform, plus many new features added for helicopters. Rotorflight borrows ideas and code also from _Heliflight3D_, an earlier fork of Betaflight for helicopters.

**Rotorflight Configurator** is a cross-platform configuration tool for the Rotorflight flight control system. It is available for Windows, Mac OS, and Linux.

Lots of effort has gone into making this release to happen. The work started almost two years ago, and about a year ago the Discord group was created, and beta testing started. Since then the community has grown and numerous snapshots have been tested and improved by a group of volunteers.


Rotorflight is _Free Software_. Meaning, it is available free of charge _without warranty_, the source code is available, and it is supported by the users themselves as a community. Rotorflight is under the GPLv3 license.

__Please read the notes below before using Rotorflight:__

1. Please read our great [Wiki](https://github.com/rotorflight/rotorflight/wiki) and consider joining our [Discord chat](https://discord.gg/FyfMF4RwSA) too!

1. Start with installing the latest version of [Rotorflight Configurator](https://github.com/rotorflight/rotorflight-configurator/releases)

1. Update all Rotorflight components at the same time: [Configurator](https://github.com/rotorflight/rotorflight-configurator/releases), [BlackBox](https://github.com/rotorflight/rotorflight-blackbox/releases) and [LUA Scripts](https://github.com/rotorflight/rotorflight-lua-scripts/releases).

1. [Backup](https://github.com/rotorflight/rotorflight/wiki/Back-up-and-restore) your current FC configuration. Whether it is still running Betaflight, or an earlier version of Rotorflight, please save the configuration dump. It is likely to be useful later on.

1. You don't need to download the firmware file - it can be [flashed](https://github.com/rotorflight/rotorflight/wiki/Installing-Rotorflight-Firmware) directly in the Configurator.

1. Be patient - there are lots of details and many new things to learn!



## Contributions

Rotorflight is made available by a group of enthusiasts, so _kudos_ to all contributors.

Origins for Rotorflight:
 - **Petri Mattila** (Dr.Rudder) - author, maintainer
 - **pkaig** - wiki, resource mapping, testing
 - **egon** - wiki, Dutch translation, Lua Scripts, testing
 - **mopatop** - wiki, testing
 - **Mike_PSL** - wiki, testing
 - **Simon Stummer** (simonsummer) - testing
 - **mattis** - German translation

Also big thanks to anybody who has participated in the testing and discussion, or just spreading the word!


## Changelog

Please see the [git history ](https://github.com/rotorflight/rotorflight-configurator/commits/master)for a complete list of changes.


### Changes from 1.0.0

- Node upgraded to 16.5.1

- NW.js upgraded to 0.62.2

- New adjustment functions added to match the firmware

- Yaw stop gain range changed to match the firmware

- RPM Filter Q value parsing fixed in the Gyro tab

- Version info display fixed in the Flasher

