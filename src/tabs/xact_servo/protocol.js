// Wire format for MSP_XACT_SERVO_LIST / MSP_XACT_PARAMS / MSP_SET_XACT_PARAMS.
//
// Field set, names, and ranges mirror FrSky's own ETHOS "XAct" Device Config Lua script
// (org.frsky-ethos.xact v2.0.2) rather than a guess -- see its basic.lua for the source of
// truth. Notably:
//   - Center is signed (-125..125), not a raw unsigned byte.
//   - "Holding Strength" (P1 in early drafts of this tab) is the only one of the 0x11/0x12
//     pair FrSky's tool exposes -- 0x12 is always silently re-written to 10 alongside it, so
//     it isn't a field here at all.
//   - The byte FrSky's tool writes to field 0x15 (labelled "TB" in early drafts of this tab)
//     isn't a tunable parameter -- it's the priming step of the save-to-flash sequence, and
//     is handled entirely on the firmware side.
//   - Working Mode / Max Angle only exist on "series 65"+ servos (firmwareVersion >= 40);
//     hasExtendedParams says whether this particular servo supports them.
//
// The firmware tracks every XACT servo discovered on the FBUS bus since the last
// MSP_SET_XACT_SCAN (not just one), so programming a specific servo is a two-step MSP flow:
//   1. MSP_XACT_SERVO_LIST (no request) -> which physical IDs are out there right now.
//   2. MSP_XACT_PARAMS(phyID) -> that one servo's full parameters, polled until "ready" (the
//      firmware only auto-reads the first servo it finds; picking a different one kicks off
//      a fresh read for it, so an initial poll or two can come back not-ready).
// MSP_SET_XACT_PARAMS writes back to whichever phyID was targeted.

// App ID base address for the FBUS servo data range -- appIdOffset (0-15) is added to this to
// get the literal bus address FrSky's own tool displays (e.g. offset 10 -> "680A").
export const FBUS_SERVO_DATA_BASE = 0x6800;

export function parseServoList(data) {
  const count = data.getUint8(0);
  const servos = [];
  for (let i = 0; i < count; i++) {
    const offset = 1 + i * 6;
    servos.push({
      physicalId: data.getUint8(offset),
      appIdOffset: data.getUint8(offset + 1),
      conflict: data.getUint8(offset + 2) !== 0,
      // Two servos sharing an App ID both act on a write meant for just one of them
      // (confirmed on real hardware), regardless of their (different) Physical IDs --
      // this is the one that actually matters for "is it safe to save".
      duplicateAppId: data.getUint8(offset + 3) !== 0,
      // The firmware reads every discovered servo's parameters in the background, so
      // channel is usually already known -- ready is false only briefly, right after
      // a servo is first discovered.
      ready: data.getUint8(offset + 4) !== 0,
      channel: data.getUint8(offset + 5),
    });
  }
  return servos;
}

export function parseServoParams(data) {
  return {
    ready: data.getUint8(0) !== 0,
    conflict: data.getUint8(1) !== 0,
    duplicateAppId: data.getUint8(2) !== 0,
    physicalId: data.getUint8(3),
    appIdOffset: data.getUint8(4),
    firmwareVersion: data.getUint8(5),
    dataRate: data.getUint16(6, true),
    range: data.getUint8(8),
    direction: data.getUint8(9),
    pulseType: data.getUint8(10),
    channel: data.getUint8(11),
    center: data.getInt8(12),
    holdingStrength: data.getUint8(13),
    operationSmoothing: data.getUint8(14),
    deadband: data.getUint8(15),
    hasExtendedParams: data.getUint8(16) !== 0,
    workingMode: data.getUint8(17),
    maxAngle: data.getUint16(18, true),
  };
}

// targetPhysicalId selects which discovered servo to write to; values.physicalId is the new
// value to write into that servo's own Physical ID field, and may differ from targetPhysicalId
// if the user is deliberately re-addressing the servo.
export function buildServoParamsPayload(targetPhysicalId, values) {
  const buf = new Uint8Array(16);
  const view = new DataView(buf.buffer);
  buf[0] = targetPhysicalId;
  buf[1] = values.physicalId;
  buf[2] = values.appIdOffset;
  view.setUint16(3, values.dataRate, true);
  buf[5] = values.range;
  buf[6] = values.direction;
  buf[7] = values.pulseType;
  buf[8] = values.channel;
  view.setInt8(9, values.center);
  buf[10] = values.holdingStrength;
  buf[11] = values.operationSmoothing;
  buf[12] = values.deadband;
  buf[13] = values.workingMode ?? 0;
  view.setUint16(14, values.maxAngle ?? 0, true);
  return buf;
}
