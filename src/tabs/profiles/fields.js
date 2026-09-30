// Profile settings shown on the Profiles tab, with their ranges and the
// conversion between the FC value and the displayed value. Mirrors the
// legacy profiles tab.

export const PROFILE_COUNT = 6;

export const AXES = ["ROLL", "PITCH", "YAW"];
export const GAINS = [
  { key: "P", label: "profilesProportional", help: "profilesProportionalHelp" },
  { key: "I", label: "profilesIntegral", help: "profilesIntegralHelp" },
  { key: "D", label: "profilesDerivative", help: "profilesDerivativeHelp" },
  { key: "F", label: "profilesFeedforward", help: "profilesFeedforwardHelp" },
  { key: "B", label: "profilesBoost", help: "profilesBoostHelp" },
];

const n = (min, max, step = 1) => ({ min, max, step });

/**
 * Plain PID_PROFILE fields: `scale` divides the FC value for display.
 * `api` limits a field to newer (">=") or older ("<") API versions.
 */
export const PID_PROFILE_FIELDS = {
  gyroCutoffRoll: n(0, 250),
  gyroCutoffPitch: n(0, 250),
  gyroCutoffYaw: n(0, 250),
  dtermCutoffRoll: n(0, 250),
  dtermCutoffPitch: n(0, 250),
  dtermCutoffYaw: n(0, 250),
  btermCutoffRoll: n(0, 250),
  btermCutoffPitch: n(0, 250),
  btermCutoffYaw: n(0, 250),
  errorLimitRoll: n(0, 180),
  errorLimitPitch: n(0, 180),
  errorLimitYaw: n(0, 180),
  offsetLimitRoll: n(0, 180),
  offsetLimitPitch: n(0, 180),
  error_decay_time_cyclic: { ...n(0, 25, 0.1), scale: 10 },
  error_decay_limit_cyclic: n(0, 250),
  itermRelaxCutoffRoll: n(1, 100),
  itermRelaxCutoffPitch: n(1, 100),
  itermRelaxCutoffYaw: n(1, 100),
  yawStopGainCW: n(25, 250),
  yawStopGainCCW: n(25, 250),
  yawPrecompCutoff: n(0, 250),
  yawFFCyclicGain: n(0, 250),
  yawFFCollectiveGain: n(0, 250),
  yawFFImpulseGain: n(-125, 125),
  yawFFImpulseDecay: n(1, 250),
  yaw_inertia_precomp_gain: n(0, 250),
  yaw_inertia_precomp_cutoff: { ...n(0, 25, 0.1), scale: 10 },
  cyclicCrossCouplingRatio: n(0, 200),
  acroTrainerGain: n(25, 255),
  acroTrainerLimit: n(10, 80),
  levelAngleStrength: n(0, 200),
  levelAngleLimit: n(10, 90),
  horizonLevelStrength: n(0, 200),
  rescueFlipMode: n(0, 1),
  rescuePullupCollective: { ...n(0, 100), scale: 10 },
  rescueClimbCollective: { ...n(0, 100), scale: 10 },
  rescueHoverCollective: { ...n(0, 100), scale: 10 },
  rescuePullupTime: { ...n(0, 25, 0.1), scale: 10 },
  rescueClimbTime: { ...n(0, 25, 0.1), scale: 10 },
  rescueFlipTime: { ...n(0, 25, 0.1), scale: 10 },
  rescueExitTime: { ...n(0, 25, 0.1), scale: 10 },
  rescueLevelGain: n(5, 250),
  rescueFlipGain: n(5, 250),
  rescueMaxRate: n(5, 1000),
  rescueMaxAccel: n(1, 10000, 10),
  rescueHoverAltitude: { ...n(0, 100, 0.1), scale: 100 },
  rescueAltitudePGain: n(0, 10000, 10),
  rescueAltitudeIGain: n(0, 10000, 10),
  rescueAltitudeDGain: n(0, 10000, 10),
  rescueMaxCollective: { ...n(0, 100), scale: 10 },
};

export function toDisplay(key, value) {
  const scale = PID_PROFILE_FIELDS[key]?.scale ?? 1;
  return value / scale;
}

export function fromDisplay(key, value) {
  const scale = PID_PROFILE_FIELDS[key]?.scale ?? 1;
  return Math.round(value * scale);
}
