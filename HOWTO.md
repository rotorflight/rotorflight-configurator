## Build Process

### Setup

1. Change to the project folder
2. Install Node.js: `nvm install`
3. Install yarn: `npm install yarn -g`
4. Install dependencies: `yarn install`
5. Run `yarn start`


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
* **Windows** use `yarn gulp <task-name> --win64`
* **Android** use `yarn gulp <task-name> --android`

**Note:** Support for cross-platform building is very limited due to the requirement for platform specific build tools. If in doubt, build on the target platform.

You can also use multiple platforms e.g. `yarn gulp <taskname> --osx64 --linux64`. Other platforms like `--win64`, `--linux32` and `--armv7` can be used too, but they are not officially supported, so use them at your own risk.

