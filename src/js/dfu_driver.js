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


function getSystemDirectory() {
    if (typeof process === "undefined") {
        return undefined;
    }

    const systemRoot = process.env.SystemRoot ?? process.env.windir;
    if (!systemRoot) {
        return undefined;
    }

    const path = getNodeModule("path");
    const systemDirectory = process.arch === "ia32" && process.env.PROCESSOR_ARCHITEW6432 ? "Sysnative" : "System32";
    return path.join(systemRoot, systemDirectory);
}

function getSystemExecutable(fileName) {
    const path = getNodeModule("path");
    const systemDirectory = getSystemDirectory();
    return systemDirectory ? path.join(systemDirectory, fileName) : fileName;
}

function getPowerShellExecutable() {
    const path = getNodeModule("path");
    const systemDirectory = getSystemDirectory();
    return systemDirectory ? path.join(systemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe") : "powershell.exe";
}

function quotePowerShellString(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
}

function quoteWindowsCommandArg(value) {
    return `"${String(value).replace(/"/g, '\\"')}"`;
}

function quoteVbsString(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

function formatProcessError(error) {
    const output = [error.stdout, error.stderr]
        .filter((value) => value && value.trim())
        .join("\n")
        .trim();

    return output || error.message;
}

function readFileIfExists(path) {
    const fs = getNodeModule("fs");
    try {
        return fs.readFileSync(path, "utf8");
    } catch {
        return "";
    }
}

function writeTextFile(path, contents) {
    const fs = getNodeModule("fs");
    fs.writeFileSync(path, contents, "utf8");
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFile(path, timeoutMs) {
    const fs = getNodeModule("fs");
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (fs.existsSync(path)) {
            return true;
        }
        await sleep(500);
    }
    return false;
}

function removeFileIfExists(path) {
    const fs = getNodeModule("fs");
    try {
        fs.unlinkSync(path);
    } catch {
        // Ignore cleanup failures for temporary install logs.
    }
}

async function runElevatedPnputilInstall(infPath) {
    const os = getNodeModule("os");
    const path = getNodeModule("path");
    const basePath = path.join(os.tmpdir(), `rotorflight-stm32-dfu-driver-${Date.now()}`);
    const outputPath = `${basePath}.log`;
    const exitCodePath = `${basePath}.exit`;
    const scriptPath = `${basePath}.ps1`;
    const launcherPath = `${basePath}.vbs`;

    const installScript = [
        "$ErrorActionPreference = 'Continue'",
        `$pnputil = ${quotePowerShellString(getSystemExecutable("pnputil.exe"))}`,
        `$inf = ${quotePowerShellString(infPath)}`,
        `$outputPath = ${quotePowerShellString(outputPath)}`,
        `$exitCodePath = ${quotePowerShellString(exitCodePath)}`,
        "$code = 1",
        "try {",
        "    & $pnputil /add-driver $inf /install *> $outputPath",
        "    $code = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 1 }",
        "    & $pnputil /scan-devices *>> $outputPath",
        "} catch {",
        "    $_ | Out-String | Add-Content -LiteralPath $outputPath",
        "} finally {",
        "    Set-Content -LiteralPath $exitCodePath -Value $code -Encoding ASCII",
        "}",
        "exit $code",
    ].join("\r\n");

    const powerShellArgs = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-File",
        quoteWindowsCommandArg(scriptPath),
    ].join(" ");

    const launcherScript = [
        "Set shell = CreateObject(\"Shell.Application\")",
        `shell.ShellExecute ${quoteVbsString(getPowerShellExecutable())}, ${quoteVbsString(powerShellArgs)}, "", "runas", 0`,
    ].join("\r\n");

    writeTextFile(scriptPath, installScript);
    writeTextFile(launcherPath, launcherScript);

    let launchError;
    try {
        await execFile(getSystemExecutable("wscript.exe"), ["//B", launcherPath]);
    } catch (error) {
        launchError = error;
    }

    const completed = await waitForFile(exitCodePath, 300000);
    const output = readFileIfExists(outputPath).trim();
    const exitCodeText = readFileIfExists(exitCodePath).trim();
    const exitCode = exitCodeText ? Number.parseInt(exitCodeText, 10) : launchError?.code;

    removeFileIfExists(outputPath);
    removeFileIfExists(exitCodePath);
    removeFileIfExists(scriptPath);
    removeFileIfExists(launcherPath);

    if (!completed && !launchError) {
        return {
            exitCode: 1,
            output: "STM32 DFU driver installation timed out or administrator permission was cancelled.",
        };
    }

    if (launchError && !Number.isFinite(exitCode)) {
        throw new Error(formatProcessError(launchError), { cause: launchError });
    }

    return {
        exitCode: Number.isFinite(exitCode) ? exitCode : 1,
        output: output || (launchError ? formatProcessError(launchError) : ""),
    };
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

    const result = await runElevatedPnputilInstall(infPath);
    if (result.exitCode === 0) {
        return isStm32DfuDriverInstalled();
    }

    if (await isStm32DfuDriverInstalled()) {
        return true;
    }

    throw new Error(result.output || `pnputil exited with code ${result.exitCode}`);
}
