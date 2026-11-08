// The head and tail rotor speeds, from the motor telemetry and the gearing (#28). Shared by the
// Motors tab's Rotor speed card and the Status tab's headspeed box, so both show the same numbers.
//
// The firmware keeps two products per gear ratio (flight/motors.c): head = motor RPM x main[0] /
// main[1]. The tail is geared from the main shaft (variable pitch, mode 0: headRatio / tail ratio)
// or driven by its own motor (motorised tail: the tail ratio alone).
import { FC } from "@/js/fc.svelte.js";

export function headRatio() {
  return (
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] /
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[1]
  );
}

export function tailRatio() {
  const ratio =
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] /
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1];

  if (FC.MIXER_CONFIG.tail_rotor_mode === 0) {
    return headRatio() / ratio;
  }

  return ratio;
}

// The motor whose RPM is the tail's: the main motor for a variable-pitch tail, motor 2 otherwise.
export function tailSource() {
  return FC.MIXER_CONFIG.tail_rotor_mode === 0 ? 0 : 1;
}

// The rotor speeds in RPM, rounded.
export function rotorSpeeds() {
  const head = Math.round(FC.MOTOR_TELEMETRY_DATA.rpm[0] * headRatio());
  const tail = Math.round(
    FC.MOTOR_TELEMETRY_DATA.rpm[tailSource()] * tailRatio(),
  );
  return { head, tail };
}
