import { VirtualSerialInterface } from "./virtual";
import { ManualSerialInterface } from "./manual";

export { DeviceType } from "./shared";

export async function getSerialInterfaces() {
  const interfaces = [];

  if (globalThis.chrome?.serial) {
    console.log("comms: chrome.serial API detected, using ChromeSerialInterface");
    const { ChromeSerialInterface } = await import("./chromeapp");
    interfaces.push(new ChromeSerialInterface());
  } else if (navigator.serial) {
    console.log("comms: WebSerial API detected, using WebSerialInterface");
    const { WebSerialInterface } = await import("./webserial");
    interfaces.push(new WebSerialInterface());
  } else {
    console.warn("comms: no serial API detected");
  }

  if (import.meta.env.DEV) {
    interfaces.push(new VirtualSerialInterface());
  }

  interfaces.push(new ManualSerialInterface());

  console.log(`comms: ${interfaces.length} interface(s) registered`);
  return interfaces;
}
