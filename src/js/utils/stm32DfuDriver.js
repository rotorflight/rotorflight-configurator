const { execFile } = globalThis.nw
    ? globalThis.nw.require('child_process')
    : require('child_process');
const fs = globalThis.nw
    ? globalThis.nw.require('fs')
    : require('fs');
const path = globalThis.nw
    ? globalThis.nw.require('path')
    : require('path');
const os = globalThis.nw
    ? globalThis.nw.require('os')
    : require('os');

function getWindowsSystemExecutable(fileName, fallback) {
    if (!isWindows()) {
        return fallback;
    }

    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const candidates = [
        `${systemRoot}\\Sysnative\\${fileName}`,
        `${systemRoot}\\System32\\${fileName}`,
        fallback,
    ];

    return candidates.find((candidate) => candidate === fallback || fs.existsSync(candidate));
}

function getPnputilPath() {
    return getWindowsSystemExecutable('pnputil.exe', 'pnputil.exe');
}

function getPowerShellPath() {
    return getWindowsSystemExecutable('WindowsPowerShell\\v1.0\\powershell.exe', 'powershell.exe');
}

function getWindowsScriptHostPath() {
    return getWindowsSystemExecutable('wscript.exe', 'wscript.exe');
}

function getApplicationRootCandidates() {
    const candidates = [];

    if (globalThis.nw?.App?.startPath) {
        candidates.push(globalThis.nw.App.startPath);
    }

    candidates.push(process.cwd());

    if (process.execPath) {
        candidates.push(path.dirname(process.execPath));
        candidates.push(path.join(path.dirname(process.execPath), 'package.nw'));
    }

    return [...new Set(candidates)];
}

function getSTM32DFUDriverAssetPath(fileName) {
    const relativeDriverPath = path.join('assets', 'windows', 'drivers', 'stm32', fileName);

    return getApplicationRootCandidates()
        .map((candidate) => path.join(candidate, relativeDriverPath))
        .find((candidate) => fs.existsSync(candidate));
}

function getSTM32DFUDriverInfPath() {
    return getSTM32DFUDriverAssetPath('STtube.inf');
}

function getSTM32DFUDriverLicenseText() {
    const licensePath = getSTM32DFUDriverAssetPath('license.txt');

    if (!licensePath) {
        return 'The bundled STMicroelectronics STM32 DFU driver license could not be found.';
    }

    return fs.readFileSync(licensePath, 'utf8');
}

function quotePowerShellString(value) {
    return `'${value.replaceAll("'", "''")}'`;
}

function quoteWindowsCommandArgument(value) {
    return `"${value.replaceAll('"', '\\"')}"`;
}

function quoteVbsString(value) {
    return `"${value.replaceAll('"', '""')}"`;
}

function createHiddenElevatedInstallScripts(driverInfPath) {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rotorflight-stm32-dfu-'));
    const installScriptPath = path.join(tempDirectory, 'install-stm32-dfu-driver.ps1');
    const elevateScriptPath = path.join(tempDirectory, 'elevate-stm32-dfu-driver.ps1');
    const runnerScriptPath = path.join(tempDirectory, 'run-stm32-dfu-driver-install.vbs');
    const stdoutPath = path.join(tempDirectory, 'pnputil.stdout.log');
    const stderrPath = path.join(tempDirectory, 'pnputil.stderr.log');
    const powerShellPath = getPowerShellPath();

    const installScript = `
$ErrorActionPreference = 'Stop'
try {
    $process = Start-Process ` +
        `-FilePath ${quotePowerShellString(getPnputilPath())} ` +
        `-ArgumentList @('/add-driver', ${quotePowerShellString(driverInfPath)}, '/install') ` +
        `-WindowStyle Hidden ` +
        `-RedirectStandardOutput ${quotePowerShellString(stdoutPath)} ` +
        `-RedirectStandardError ${quotePowerShellString(stderrPath)} ` +
        `-Wait ` +
        `-PassThru
    exit $process.ExitCode
} catch {
    $_ | Out-File -FilePath ${quotePowerShellString(stderrPath)} -Append
    exit 1
}
`;

    const elevateScript = `
$ErrorActionPreference = 'Stop'
try {
    $process = Start-Process ` +
        `-FilePath ${quotePowerShellString(powerShellPath)} ` +
        `-ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', ${quotePowerShellString(installScriptPath)}) ` +
        `-Verb RunAs ` +
        `-WindowStyle Hidden ` +
        `-Wait ` +
        `-PassThru
    exit $process.ExitCode
} catch {
    $_ | Out-File -FilePath ${quotePowerShellString(stderrPath)} -Append
    exit 1
}
`;

    const hiddenPowerShellCommand = [
        quoteWindowsCommandArgument(powerShellPath),
        '-NoProfile',
        '-WindowStyle Hidden',
        '-ExecutionPolicy Bypass',
        '-File',
        quoteWindowsCommandArgument(elevateScriptPath),
    ].join(' ');

    const runnerScript = `
Dim shell
Dim exitCode
Set shell = CreateObject("WScript.Shell")
exitCode = shell.Run(${quoteVbsString(hiddenPowerShellCommand)}, 0, True)
WScript.Quit exitCode
`;

    fs.writeFileSync(installScriptPath, installScript, 'utf8');
    fs.writeFileSync(elevateScriptPath, elevateScript, 'utf8');
    fs.writeFileSync(runnerScriptPath, runnerScript, 'utf8');

    return {
        tempDirectory,
        runnerScriptPath,
        stdoutPath,
        stderrPath,
    };
}

function readInstallLog(stdoutPath, stderrPath) {
    return [stderrPath, stdoutPath]
        .filter((logPath) => fs.existsSync(logPath))
        .map((logPath) => fs.readFileSync(logPath, 'utf8').trim())
        .filter(Boolean)
        .join('\n');
}

function removeInstallScripts(tempDirectory) {
    if (tempDirectory) {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
}

function isWindows() {
    return process.platform === 'win32';
}

function checkSTM32DFUDriverInstalled() {
    return new Promise((resolve) => {
        if (!isWindows()) {
            resolve({
                supported: false,
                installed: false,
                message: 'Unsupported platform',
            });
            return;
        }

        execFile(
            getPnputilPath(),
            ['/enum-drivers'],
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        supported: true,
                        installed: false,
                        message: stderr || error.message,
                    });
                    return;
                }

                const output = stdout.toLowerCase();

                // Detect official STM32 DFU driver package
                // Use INF package name only for best Win10/Win11 compatibility
                const installed = output.includes('sttube.inf');

                resolve({
                    supported: true,
                    installed,
                    message: installed
                        ? 'STM32 DFU driver installed'
                        : 'STM32 DFU driver not installed',
                });
            }
        );
    });
}

function checkSTM32DFUDevicePresent() {
    return new Promise((resolve) => {
        if (!isWindows()) {
            resolve({
                supported: false,
                present: false,
                message: 'Unsupported platform',
            });
            return;
        }

        execFile(
            getPnputilPath(),
            ['/enum-devices', '/connected'],
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        supported: true,
                        present: false,
                        message: stderr || error.message,
                    });
                    return;
                }

                const output = stdout.toLowerCase();

                // STM32 DFU bootloader VID/PID
                const present =
                    output.includes('vid_0483&pid_df11');

                resolve({
                    supported: true,
                    present,
                    message: present
                        ? 'STM32 DFU device detected'
                        : 'No STM32 DFU device detected',
                });
            }
        );
    });
}


function installSTM32DFUDriver() {
    return new Promise((resolve) => {
        if (!isWindows()) {
            resolve({
                supported: false,
                installed: false,
                message: 'Unsupported platform',
            });
            return;
        }

        const driverInfPath = getSTM32DFUDriverInfPath();

        if (!driverInfPath) {
            resolve({
                supported: true,
                installed: false,
                message: 'STM32 DFU driver package not found',
            });
            return;
        }

        let installScripts;

        try {
            installScripts = createHiddenElevatedInstallScripts(driverInfPath);
        } catch (error) {
            resolve({
                supported: true,
                installed: false,
                message: error.message,
            });
            return;
        }

        execFile(
            getWindowsScriptHostPath(),
            ['//B', '//NoLogo', installScripts.runnerScriptPath],
            { windowsHide: true },
            (error) => {
                const installLog = readInstallLog(installScripts.stdoutPath, installScripts.stderrPath);
                removeInstallScripts(installScripts.tempDirectory);

                if (error) {
                    resolve({
                        supported: true,
                        installed: false,
                        message: installLog || error.message,
                    });
                    return;
                }

                resolve({
                    supported: true,
                    installed: true,
                    message: installLog || 'STM32 DFU driver installation completed',
                });
            }
        );
    });
}

async function getSTM32DFUStatus() {
    const driver = await checkSTM32DFUDriverInstalled();
    const device = await checkSTM32DFUDevicePresent();

    return {
        supported: driver.supported && device.supported,
        driverInstalled: driver.installed,
        devicePresent: device.present,
    };
}

export {
    checkSTM32DFUDriverInstalled,
    checkSTM32DFUDevicePresent,
    getSTM32DFUStatus,
    getSTM32DFUDriverLicenseText,
    installSTM32DFUDriver,
};
