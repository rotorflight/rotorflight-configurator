import { serial } from "@/js/serial.js";

// TODO: Merge into serial driver
class PortUsage {
  down = $state(0);
  up = $state(0);

  #prevReceived = 0;
  #prevSent = 0;

  constructor() {
    this.timer = globalThis.setInterval(() => {
      this.update();
    }, 1000);
  }

  update() {
    if (serial.bitrate) {
      this.down =
        (100 * (serial.bytesReceived - this.#prevReceived)) /
        (serial.bitrate / 8);

      this.up =
        (100 * (serial.bytesSent - this.#prevSent)) / (serial.bitrate / 8);

      this.#prevReceived = serial.bytesReceived;
      this.#prevSent = serial.bytesSent;
    } else {
      this.down = 0;
      this.up = 0;
    }
  }

  reset() {
    this.#prevReceived = 0;
    this.#prevSent = 0;
    this.down = 0;
    this.up = 0;
  }
}

export const portUsage = new PortUsage();
