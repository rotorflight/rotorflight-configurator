const { execFile } = globalThis.nw
    ? globalThis.nw.require('child_process')
    : require('child_process');
const fs = globalThis.nw
    ? globalThis.nw.require('fs')
    : require('fs');
const path = globalThis.nw
    ? globalThis.nw.require('path')
    : require('path');

function getPnputilPath() {
    if (!isWindows()) {
        return 'pnputil.exe';
    }

    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const pnputilCandidates = [
        `${systemRoot}\\Sysnative\\pnputil.exe`,
        `${systemRoot}\\System32\\pnputil.exe`,
        'pnputil.exe',
    ];

    return pnputilCandidates.find((candidate) => candidate === 'pnputil.exe' || fs.existsSync(candidate));
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

function getSTM32DFUDriverInfPath() {
    const relativeDriverPath = path.join('assets', 'windows', 'drivers', 'stm32', 'STtube.inf');

    return getApplicationRootCandidates()
        .map((candidate) => path.join(candidate, relativeDriverPath))
        .find((candidate) => fs.existsSync(candidate));
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

        const command = [
            '$process = Start-Process',
            `-FilePath '${getPnputilPath().replaceAll("'", "''")}'`,
            `-ArgumentList @('/add-driver', '${driverInfPath.replaceAll("'", "''")}', '/install')`,
            '-Verb RunAs',
            '-Wait',
            '-PassThru;',
            'exit $process.ExitCode',
        ].join(' ');

        execFile(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        supported: true,
                        installed: false,
                        message: stderr || stdout || error.message,
                    });
                    return;
                }

                resolve({
                    supported: true,
                    installed: true,
                    message: 'STM32 DFU driver installation completed',
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
    installSTM32DFUDriver,
};
