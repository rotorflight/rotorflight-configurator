const { execFile } = globalThis.nw
    ? globalThis.nw.require('child_process')
    : require('child_process');

function getPnputilPath() {
    if (!isWindows()) {
        return 'pnputil.exe';
    }

    return `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\pnputil.exe`;
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
};