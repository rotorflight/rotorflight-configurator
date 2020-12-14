# Rotorflight Configurator

Rotorflight Configurator is a crossplatform configuration tool for the Rotorflight flight control system.

Rotorflight Configurator is forked from Betaflight Configurator.

## Installation

### Standalone

**This is the default installation method, and at some point in the future this will become the only way available for most platforms. Please use this method whenever possible.**

Download the installer from [Releases.](https://github.com/rotorflight/rotorflight-configurator/releases)

### Notes

#### Windows users

The minimum required version of windows is Windows 8.

#### MacOS X users

Changes to the security model used in the latest versions of MacOS X 10.14 (Mojave) and 10.15 (Catalina) mean that the operating system will show an error message ('"Rotorflight Configurator.app" is damaged and can’t be opened. You should move it to the Trash.') when trying to install the application. To work around this, run the following command in a terminal after installing: `sudo xattr -rd com.apple.quarantine /Applications/Rotorflight\ Configurator.app`.

#### Linux users

In most Linux distributions your user won't have access to serial interfaces by default. To add this access right type the following command in a terminal, log out your user and log in again:

```
sudo usermod -aG dialout ${USER}
```

#### Graphics Issues

If you experience graphics display problems or smudged/dithered fonts display issues in Rotorflight Configurator, try invoking the `rotorflight-configurator` executable file with the `--disable-gpu` command line switch. This will switch off hardware graphics acceleration. Likewise, setting your graphics card antialiasing option to OFF (e.g. FXAA parameter on NVidia graphics cards) might be a remedy as well.


### Development

1. Install node.js (version 10 required)
2. Install yarn: `npm install yarn -g`
3. (For Android platform only) Install Java JDK 8, Gradle and Android Studio (Android SDK at least level 19)
4. Change to project folder and run `yarn install`.
5. Run `yarn start`.

### Running tests

`yarn test`

### App build and release

The tasks are defined in `gulpfile.js` and can be run with through yarn:
```
yarn gulp <taskname> [[platform] [platform] ...]
```

List of possible values of `<task-name>`:
* **dist** copies all the JS and CSS files in the `./dist` folder [2].
* **apps** builds the apps in the `./apps` folder [1].
* **debug** builds debug version of the apps in the `./debug` folder [1][3].
* **release** zips up the apps into individual archives in the `./release` folder [1]. 

[1] Running this task on macOS or Linux requires Wine, since it's needed to set the icon for the Windows app (build for specific platform to avoid errors).
[2] For Android platform, **dist** task will generate folders and files in the `./dist_cordova` folder.
[3] For Android platform, you need to configure an emulator or to plug an Android device with USB debugging enabled

#### Build or release app for one specific platform

To build or release only for one specific platform you can append the plaform after the `task-name`.
If no platform is provided, the build for the host platform is run.

* **MacOS X** use `yarn gulp <task-name> --osx64`
* **Linux** use `yarn gulp <task-name> --linux64` 
* **Windows** use `yarn gulp <task-name> --win32` 
* **Android** use `yarn gulp <task-name> --android`

**Note:** Support for cross-platform building is very limited due to the requirement for platform specific build tools. If in doubt, build on the target platform.

You can also use multiple platforms e.g. `yarn gulp <taskname> --osx64 --linux64`. Other platforms like `--win64`, `--linux32` and `--armv7` can be used too, but they are not officially supported, so use them at your own risk.

### Issue trackers

For Rotorflight configurator issues raise them here

https://github.com/rotorflight/rotorflight-configurator/issues

For Rotorflight firmware issues raise them here

https://github.com/rotorflight/rotorflight-firmware/issues

## Technical details

The configurator is based on chrome.serial API running on Google Chrome/Chromium core.

## Developers

Please see the Rotorflight [Wiki](https://github.com/rotorflight/rotorflight/wiki)

## Credits

Dr.Rudder - author and maintainer of the Rotorflight fork.

James-T1 - author of Heliflight3D, another Betaflight fork for helicopters.

Westie - Logo for Rotorflight and Heliflight3D

ctn - primary author and maintainer of Baseflight Configurator from which Cleanflight Configurator project was forked.

Hydra -  author and maintainer of Cleanflight Configurator from which the Betaflight project was forked.
