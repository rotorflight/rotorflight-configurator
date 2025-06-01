import { RC_COMMAND } from "./rc_command.svelte.js";

export const Setpoint = {
  get roll() {
    return (RC_COMMAND.roll?.percent ?? 0) * 300;
  },
  get pitch() {
    return (RC_COMMAND.pitch?.percent ?? 0) * 300;
  },
  get yaw() {
    return (RC_COMMAND.yaw?.percent ?? 0) * 600;
  },
};
