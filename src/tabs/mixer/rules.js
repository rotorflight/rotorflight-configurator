import { Mixer } from "@/js/Mixer.js";

// Firmware's mixer operators (pg/mixer.h). NOP rules are skipped
// entirely by mixerUpdateRules(), which is what makes it a usable
// "chosen nothing yet" state.
export const OP_NOP = 0;
export const OP_SET = 1;

// Firmware's output index space, as laid out in Mixer.outputNames:
// 0 = None, 1-26 = Servo 1-26, 27-30 = Motor 1-4.
export const FIRST_MOTOR = 27;

/**
 * How many rules are in use. FC.MIXER_RULES is kept compacted -- every
 * used rule occupies a contiguous prefix, with null rules filling the
 * rest. That invariant is what lets a displayed row's position double as
 * its real firmware slot index, and what makes a neighbour-swap a
 * well-defined "move".
 */
export function visibleRuleCount(rules) {
  let count = 0;
  while (count < rules.length && !Mixer.isNullRule(rules[count])) count++;
  return count;
}

/**
 * Marks the runs of adjacent rules that share an output, so the table can
 * draw each output's rules as one group. Just reads off runs --
 * regroupRule() is what guarantees they're contiguous in the first place.
 * Rules with no output (dst 0) never group, even with each other.
 */
export function computeRuleGroups(rules, visibleCount) {
  const groupStart = {};
  const groupEnd = {};

  let runStart = 0;

  for (let index = 0; index < visibleCount; index++) {
    const dst = rules[index].dst;
    const nextDst = index + 1 < visibleCount ? rules[index + 1].dst : null;
    const runContinues = dst !== 0 && nextDst === dst;

    if (!runContinues) {
      groupStart[runStart] = true;
      groupEnd[index] = true;
      runStart = index + 1;
    }
  }

  return { groupStart, groupEnd };
}

/**
 * Enforces that the first rule for any output is Set (so the output
 * starts from a known value rather than whatever the previous evaluation
 * left behind) and that no later rule for it is (an unconditional Set
 * there would silently discard every earlier rule's contribution).
 * Later rules are forced to NOP rather than guessed as Add, so the user
 * has to choose Add or Mul deliberately. "None" rules are exempt - they
 * drive nothing, so oper is inconsequential.
 *
 * @returns {boolean} whether anything changed.
 */
export function enforceOperInvariant(rules) {
  const visibleCount = visibleRuleCount(rules);
  const outputsSeen = new Set();
  let changed = false;

  for (let index = 0; index < visibleCount; index++) {
    const rule = rules[index];
    if (rule.dst === 0) continue;

    const firstForOutput = !outputsSeen.has(rule.dst);
    outputsSeen.add(rule.dst);

    if (firstForOutput && rule.oper !== OP_SET) {
      rule.oper = OP_SET;
      changed = true;
    } else if (!firstForOutput && rule.oper === OP_SET) {
      rule.oper = OP_NOP;
      changed = true;
    }
  }

  return changed;
}

/**
 * Keeps rules grouped by output with no gaps. Called when the rule at
 * `index` has just been given a new output: lifts it out and drops it
 * back in right after the last existing rule for that output, so it joins
 * that output's group instead of leaving a second, disconnected one. If
 * nothing already targets that output (or it's "None"), it lands at the
 * end. Only the moved rule is reordered; everything else keeps its
 * relative order.
 */
export function regroupRule(rules, index) {
  const rule = rules[index];
  const dst = rule.dst;

  rules.splice(index, 1);

  let insertAt = -1;
  if (dst !== 0) {
    rules.forEach((r, i) => {
      if (!Mixer.isNullRule(r) && r.dst === dst) insertAt = i + 1;
    });
  }
  if (insertAt === -1) {
    insertAt = rules.findIndex(Mixer.isNullRule);
    if (insertAt === -1) insertAt = rules.length;
  }

  rules.splice(insertAt, 0, rule);

  // The moved rule's new group -- and, if it used to be some other
  // group's first rule, the group it left behind -- may now have the
  // wrong rule marked Set. Fix that as part of the same move.
  enforceOperInvariant(rules);
}

/**
 * Restores both invariants on freshly-read data: every populated rule
 * forms a contiguous prefix, and rules for the same output sit together
 * within it. Rules can arrive violating either -- someone added a mixer
 * for an existing output straight from the CLI, or cleared a middle slot
 * with `mixer rule 3 0 0 0 0 0`.
 *
 * Stable: each output's rules keep their relative order, and the position
 * an output first appears in decides where its whole group sits. "None"
 * rules never merge with each other.
 *
 * @returns {boolean} whether anything moved, so the caller only marks the
 *   tab dirty when the FC's copy actually differs from this one.
 */
export function normalizeRuleGroups(rules) {
  // Deliberately scans every slot rather than using visibleRuleCount(),
  // which stops at the first null -- exactly the kind of gap this has to
  // compact away, so relying on it would strand every real rule past it.
  const populated = rules.filter((rule) => !Mixer.isNullRule(rule));

  const groups = new Map();
  const order = [];

  populated.forEach((rule) => {
    const key = rule.dst === 0 ? Symbol() : rule.dst;

    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(rule);
  });

  let changed = false;
  let index = 0;

  order.forEach((key) => {
    groups.get(key).forEach((rule) => {
      if (rules[index] !== rule) changed = true;
      rules[index] = rule;
      index++;
    });
  });

  // Anything left over is either already-null padding or a stale rule now
  // duplicated earlier in the compacted prefix -- either way it has to
  // become an explicit null, or a gap that used to sit before some of
  // these rules leaves that duplicate behind at its old slot.
  while (index < rules.length) {
    if (!Mixer.isNullRule(rules[index])) {
      rules[index] = Mixer.nullRule();
      changed = true;
    }
    index++;
  }

  return changed;
}

// The stabilized axes, which the override section already gives their
// own dedicated rows. Rules driven by one of these are left out of the
// per-output grouping below rather than being listed twice.
export const STATIC_OVERRIDE_INPUTS = new Set([1, 2, 3, 4]);

/**
 * Outputs driven by at least one custom rule whose input isn't "None" or
 * a stabilized axis, mapped to the inputs feeding each -- e.g.
 * `{ 5: Set{17, 20} }` for a Servo 5 driven by both AUX2 and RC 10.
 *
 * Grouping by output is what makes it clear which rules combine to drive
 * a given servo/motor, with each still testable on its own. An input
 * feeding more than one output appears under every output it affects,
 * because overriding it really does move all of them at once -- there's
 * no single group it belongs to more than another.
 *
 * @returns {Map<number, Set<number>>} output index -> input indices.
 */
export function dynamicOverrideGroups(rules) {
  const groups = new Map();
  const visibleCount = visibleRuleCount(rules);

  for (let index = 0; index < visibleCount; index++) {
    const { src, dst } = rules[index];
    if (src === 0 || dst === 0 || STATIC_OVERRIDE_INPUTS.has(src)) continue;

    if (!groups.has(dst)) groups.set(dst, new Set());
    groups.get(dst).add(src);
  }

  return groups;
}

/**
 * What the rules driving `dst` would produce from the values currently
 * dialled into the override table, as an RC pulse width.
 *
 * Needed for motors, where the FC can't report anything useful: while
 * disarmed its motor outputs ignore the mixer entirely (motorUpdate()
 * reads motorOverride[] instead), so a readback sits at idle no matter
 * what the rules compute.
 *
 * Mirrors firmware's mixerUpdateRules() exactly -- same running
 * accumulator, same per-rule maths, same operator order:
 *     val = input * rate / 1000
 *     out = (offset + weight * val) / 1000
 * with Set assigning it, Add adding it, Mul multiplying by it.
 *
 * @param {object[]} rules
 * @param {object[]} inputs - FC.MIXER_INPUTS, for each input's rate.
 * @param {Record<number, number>} values - raw override value per input.
 * @param {number} dst
 */
export function simulateOutputValue(rules, inputs, values, dst) {
  const visibleCount = visibleRuleCount(rules);
  let output = 0;

  for (let index = 0; index < visibleCount; index++) {
    const rule = rules[index];
    if (rule.dst !== dst || !rule.oper) continue;

    const input = inputs[rule.src];
    const raw = values[rule.src] || 0;
    const val = ((raw / 1000) * (input ? input.rate : 0)) / 1000;
    const out = (rule.offset + rule.weight * val) / 1000;

    switch (rule.oper) {
      case 1:
        output = out;
        break; // Set
      case 2:
        output += out;
        break; // Add
      case 3:
        output *= out;
        break; // Mul
    }
  }

  // Firmware reports a motor as output * 1000 + 1000 (MSP_MOTOR), i.e.
  // 0 -> 1000us, full -> 2000us.
  return Math.min(2000, Math.max(1000, output * 1000 + 1000));
}

/**
 * Outputs the built-in swash/tail mixing already drives for the selected
 * swash type, independent of anything in the custom rule table.
 */
export function builtinOutputSet(config) {
  const outputs = new Set();

  const SERVO1 = 1,
    SERVO2 = 2,
    SERVO3 = 3,
    SERVO4 = 4,
    MOTOR1 = 27,
    MOTOR2 = 28;

  const swashType = config.swash_type;
  if (swashType === Mixer.SWASH_TYPE_NONE) return outputs;

  outputs.add(MOTOR1);

  switch (swashType) {
    case Mixer.SWASH_TYPE_120:
    case Mixer.SWASH_TYPE_135:
    case Mixer.SWASH_TYPE_140:
    case Mixer.SWASH_TYPE_THRU:
      outputs.add(SERVO1);
      outputs.add(SERVO2);
      outputs.add(SERVO3);
      break;
    case Mixer.SWASH_TYPE_90L:
    case Mixer.SWASH_TYPE_90V:
      outputs.add(SERVO1);
      outputs.add(SERVO2);
      break;
  }

  outputs.add(config.tail_rotor_mode > 0 ? MOTOR2 : SERVO4);

  return outputs;
}

/**
 * Whether an output actually exists on this craft, per the counts the FC
 * reports. Worth being strict about: firmware only drives outputs below
 * its own servo/motor count, and the ones above report a steady centre
 * value rather than going silent -- so a rule pointing at one looks like
 * it's working while doing nothing at all.
 */
export function isConfiguredOutput(index, servoCount, motorCount) {
  if (index === 0) return true;
  if (index >= FIRST_MOTOR) return index - (FIRST_MOTOR - 1) <= motorCount;
  return index <= servoCount;
}

/**
 * Whether any output is left for a brand new rule to target: one that
 * both exists and isn't already claimed by the built-in mixing. A craft
 * with no spare servo/motor has nothing a new rule could point at, even
 * though extra Add/Mul rules can still be stacked on an output some rule
 * already drives. Mixer.outputNames is sparse, so some() skips the holes.
 */
export function anyOutputAvailable(builtinOutputs, servoCount, motorCount) {
  return Mixer.outputNames.some(
    (name, index) =>
      index !== 0 &&
      isConfiguredOutput(index, servoCount, motorCount) &&
      !builtinOutputs.has(index),
  );
}
