const STM32_DFU_DEVICE_ID = "USB\\VID_0483&PID_DF11";
const STM32_DFU_INF_NAME = "STM32Bootloader.inf";

function getNodeRequire() {
    return globalThis.nw?.require ?? globalThis.require;
}

function getNodeModule(name) {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) {
        throw new Error("Node.js integration is not available");
    }

    return nodeRequire(name);
}

function execFile(file, args, options = {}) {
    const childProcess = getNodeModule("child_process");
    const execOptions = { windowsHide: true, ...options };

    return new Promise((resolve, reject) => {
        childProcess.execFile(file, args, execOptions, (error, stdout, stderr) => {
            if (error) {
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }

            resolve({ stdout, stderr });
        });
    });
}

function execCommand(command, options = {}) {
    const childProcess = getNodeModule("child_process");
    const execOptions = { windowsHide: true, ...options };

    return new Promise((resolve, reject) => {
        childProcess.exec(command, execOptions, (error, stdout, stderr) => {
            if (error) {
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }

            resolve({ stdout, stderr });
        });
    });
}

function quoteWindowsCommandArg(value) {
    return `"${String(value).replace(/"/g, '\\"')}"`;
}

function getSystemExecutable(fileName) {
    if (typeof process === "undefined") {
        return fileName;
    }

    const systemRoot = process.env.SystemRoot ?? process.env.windir;
    if (!systemRoot) {
        return fileName;
    }

    const path = getNodeModule("path");
    const systemDirectory = process.arch === "ia32" && process.env.PROCESSOR_ARCHITEW6432 ? "Sysnative" : "System32";
    return path.join(systemRoot, systemDirectory, fileName);
}

function formatProcessError(error) {
    const output = [error.stdout, error.stderr]
        .filter((value) => value && value.trim())
        .join("\n")
        .trim();

    return output || error.message;
}

function hasStm32DfuDriver(output) {
    return /stm32bootloader\.inf/i.test(output)
        || /stm32 bootloader/i.test(output)
        || /vid_0483&pid_df11/i.test(output);
}

async function hasDriverPackage() {
    const { stdout, stderr } = await execFile(getSystemExecutable("pnputil.exe"), ["/enum-drivers"]);
    return hasStm32DfuDriver(`${stdout}\n${stderr}`);
}

async function hasInstalledDeviceDriver() {
    try {
        const { stdout, stderr } = await execFile(getSystemExecutable("pnputil.exe"), ["/enum-devices", "/instanceid", STM32_DFU_DEVICE_ID]);
        const output = `${stdout}\n${stderr}`;
        return /vid_0483&pid_df11/i.test(output) && (/winusb/i.test(output) || /stm32 bootloader/i.test(output));
    } catch (error) {
        const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
        return /vid_0483&pid_df11/i.test(output) && (/winusb/i.test(output) || /stm32 bootloader/i.test(output));
    }
}

export async function isStm32DfuDriverInstalled() {
    if (GUI.operating_system !== "Windows") {
        return true;
    }

    if (await hasDriverPackage()) {
        return true;
    }

    return hasInstalledDeviceDriver();
}

function pathExists(path) {
    const fs = getNodeModule("fs");
    return fs.existsSync(path);
}

function getAppDirectory() {
    if (typeof process === "undefined") {
        return undefined;
    }

    return process.cwd();
}

function getExecutableDirectory(path) {
    if (typeof process === "undefined" || !process.execPath) {
        return undefined;
    }

    return path.dirname(process.execPath);
}

export function findStm32DfuDriverInf() {
    const path = getNodeModule("path");
    const candidates = [
        path.join(getAppDirectory() ?? "", "assets", "windows", "drivers", "stm32", STM32_DFU_INF_NAME),
        path.join(getAppDirectory() ?? "", "drivers", "stm32", STM32_DFU_INF_NAME),
        path.join(getExecutableDirectory(path) ?? "", "drivers", "stm32", STM32_DFU_INF_NAME),
    ];

    return candidates.find(pathExists);
}

export async function installStm32DfuDriver() {
    if (GUI.operating_system !== "Windows") {
        return true;
    }

    const infPath = findStm32DfuDriverInf();
    if (!infPath) {
        throw new Error("STM32 DFU driver package was not found");
    }

    const pnputilPath = getSystemExecutable("pnputil.exe");
    const command = [
        quoteWindowsCommandArg(pnputilPath),
        "/add-driver",
        quoteWindowsCommandArg(infPath),
        "/install",
    ].join(" ");

    try {
        await execCommand(command);
    } catch (error) {
        if (await isStm32DfuDriverInstalled()) {
            return true;
        }

        throw new Error(formatProcessError(error), { cause: error });
    }

    return isStm32DfuDriverInstalled();
}
