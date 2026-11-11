import { Mixer } from "@/js/Mixer.js";

// Top view of the swashplate servos for each Mixer.SWASH_TYPE_* value, nose
// up. Angles are measured from the nose, positive towards the right side;
// they follow the servo order of mixerUpdateSwash() in the firmware.
export const SWASH_LAYOUTS = {
  [Mixer.SWASH_TYPE_THRU]: [
    { angle: null, role: "swashServoRolePitch" },
    { angle: null, role: "swashServoRoleRoll" },
    { angle: null, role: "swashServoRoleCollective" },
  ],
  [Mixer.SWASH_TYPE_120]: ccpm(120),
  [Mixer.SWASH_TYPE_135]: ccpm(135),
  [Mixer.SWASH_TYPE_140]: ccpm(140),
  [Mixer.SWASH_TYPE_90L]: [
    { angle: 0, role: "swashServoRoleFront" },
    { angle: -90, role: "swashServoRoleLeft" },
  ],
  [Mixer.SWASH_TYPE_90V]: [
    { angle: -45, role: "swashServoRoleFrontLeft" },
    { angle: 45, role: "swashServoRoleFrontRight" },
  ],
};

// A variable pitch tail is always on servo 4 (mixerInit() in the firmware).
export const TAIL_SERVO = 3;

function ccpm(angle) {
  return [
    { angle: 0, role: "swashServoRoleCenter" },
    { angle: -angle, role: "swashServoRoleLeft" },
    { angle: angle, role: "swashServoRoleRight" },
  ];
}
