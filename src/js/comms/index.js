import { VirtualSerialInterface } from "./virtual";
import { ManualSerialInterface } from "./manual";

export { DeviceType } from "./shared";

export async function getInterfaces() {
  const interfaces = [];

  if (globalThis.chrome?.serial) {
    console.log("comms: chrome.serial API detected, using ChromeSerialInterface");
    const { ChromeSerialInterface } = await import("./chromeapp");
    interfaces.push({ iface: new ChromeSerialInterface(), kind: "serial" });
  } else if (navigator.serial) {
    console.log("comms: WebSerial API detected, using WebSerialInterface");
    const { WebSerialInterface } = await import("./webserial");
    interfaces.push({ iface: new WebSerialInterface(), kind: "serial" });
  } else {
    console.warn("comms: no serial API detected");
  }

  if (globalThis.chrome?.usb) {
    console.log("comms: chrome.usb API detected, using ChromeUsbDfuInterface");
    const { ChromeUsbDfuInterface } = await import("./chromedfu");
    interfaces.push({ iface: new ChromeUsbDfuInterface(), kind: "dfu" });
  } else if (navigator.usb) {
    console.log("comms: WebUSB API detected, using WebUsbDfuInterface");
    const { WebUsbDfuInterface } = await import("./webdfu");
    interfaces.push({ iface: new WebUsbDfuInterface(), kind: "dfu" });
  } else {
    console.warn("comms: no USB API detected for DFU");
  }

  if (import.meta.env.DEV) {
    interfaces.push({ iface: new VirtualSerialInterface(), kind: "serial" });
  }

  interfaces.push({ iface: new ManualSerialInterface(), kind: "serial" });

  console.log(
    `comms: ${interfaces.length} interface(s) registered ` +
    `(${interfaces.filter((i) => i.kind === "serial").length} serial, ` +
    `${interfaces.filter((i) => i.kind === "dfu").length} DFU)`,
  );
  return interfaces;
}
