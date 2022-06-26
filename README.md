# Rotorflight Configurator

**Rotorflight** is a _Flight Control_/_FBL_ Software Suite for traditional single-rotor RC helicopters. It is based on Betaflight 4.2, enjoying all the great features of the Betaflight platform, plus many new features added for helicopters. Rotorflight borrows ideas and code also from Heliflight3D, an earlier fork of Betaflight for helicopters.

**Rotorflight Configurator** is a cross-platform configuration tool for the Rotorflight flight control system. It is available for Windows, Mac OS, and Linux.

Rotorflight does **NOT** support multi-rotor 'drones', nor airplanes; it is only for traditinal RC helicopters, including co-axial and tandem helicopters.


## Installation

Please download the latest version from github:

 - https://github.com/rotorflight/rotorflight-configurator/releases

Then follow the instructions in the [Wiki](https://github.com/rotorflight/rotorflight/wiki/Installing-Rotorflight-Firmware).


## Information

For more information, please see our github space:

 - [Main page](https://github.com/rotorflight)
 - [Rotorflight Wiki](https://github.com/rotorflight/rotorflight/wiki)


## Notes

#### MacOS X users

Changes to the security model used in the latest versions of MacOS X 10.14 (Mojave) and 10.15 (Catalina) mean that the operating system will show an error message ('"Rotorflight Configurator.app" is damaged and can’t be opened. You should move it to the Trash.') when trying to install the application. To work around this, run the following command in a terminal after installing: `sudo xattr -rd com.apple.quarantine /Applications/Rotorflight\ Configurator.app`.

#### Linux users

In most Linux distributions your user won't have access to serial interfaces by default. To add this access right type the following command in a terminal, log out your user and log in again:

```
sudo usermod -aG dialout ${USER}
```

#### Graphics Issues

If you experience graphics display problems or smudged/dithered fonts display issues in Rotorflight Configurator, try invoking the `rotorflight-configurator` executable file with the `--disable-gpu` command line switch. This will switch off hardware graphics acceleration. Likewise, setting your graphics card antialiasing option to OFF (e.g. FXAA parameter on NVidia graphics cards) might be a remedy as well.


## Contributing

Contributions are welcome and encouraged. You can contribute in many ways:

 - testing Rotorflight with different types of helicopters
 - improving the documentation in the Wiki
 - writing How-To guides
 - provide a new translation for the configurator
 - implement new features or fix bugs
 - reporting bugs
 - new ideas & suggestions
 - helping other users


For reporting Rotorflight issues or bugs, please raise them here:

 - [Feature requests](https://github.com/rotorflight/rotorflight/issues)
 - [Configurator issue tracker](https://github.com/rotorflight/rotorflight-configurator/issues)
 - [Blackbox issue tracker](https://github.com/rotorflight/rotorflight-blackbox/issues)
 - [Firmware issue tracker](https://github.com/rotorflight/rotorflight-firmware/issues)


## Credits

Rotorflight is Free Software. Meaning, it is available free of charge _without warranty_, the source code is available, and it is supported by the users themselves as a community. Rotorflight is under the GPLv3 license.

Rotorflight is forked from Betaflight, which in turn is forked from Cleanflight.
Rotorflight borrows ideas and code also from Heliflight-3D, another Betaflight fork for helis.

So thanks goes to all those whom have contributed along the way.

Origins for Rotorflight:

 - **Petri Mattila** (Dr.Rudder) - author and maintainer
 - **pkaig** - wiki, resource mapping, testing
 - **egon** - wiki, Dutch translation, Lua Scripts, testing
 - **mopatop** - wiki, testing
 - **Mike_PSL** - wiki, testing
 - **mattis** - German translation, testing
 - **Simon Stummer** (simonsummer) - testing

Origin for Heliflight-3D and Betaflight:

 - **James-T1** - author
 - **Westie** - Rotorflight and Heliflight3D logo
 - **ctn** - primary author and maintainer of Baseflight Configurator
 - **Hydra** -  author and maintainer of Cleanflight Configurator

And many others.
