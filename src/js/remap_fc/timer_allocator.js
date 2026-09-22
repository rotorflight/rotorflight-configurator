/**
 * File: src/js/remap_fc/timer_allocator.js
 * Picks a non-clashing timer+channel for every feature in a working
 * hardware map:
 *
 *   1. No two features may ever share a full timer+channel (e.g. two
 *      features both on "TIM3 CH1", or one on "TIM3 CH1" and another
 *      on "TIM3 CH1N" -- same channel, opposite polarity, still a
 *      clash).
 *   2. A timer base (e.g. "TIM3") may not be shared between different
 *      feature types -- if a servo is using TIM3, no motor/freq/LED/
 *      other feature may also use TIM3, even on a different channel.
 *      Same-type sharing is allowed, still subject to rule 1.
 *   3. A base is "critical" for a feature if it's that feature's only
 *      possible base. Non-critical-owning features avoid a base that's
 *      critical for someone else whenever they have any alternative,
 *      so the feature that has no other choice keeps its only option
 *      open. A feature may always use its own critical base. For a
 *      group (S1-S3, M1-M4), a base is still fair game if every
 *      critical owner of that base is within the group itself.
 *   4. S1-S3 and M1-M4 prefer to share one common base with a unique
 *      channel each, tried before falling back to allocating each
 *      member individually -- on whichever subset of the group actually
 *      has a row (at least two), not only when the full canonical group
 *      is present.
 *   5. Frequency inputs (Freq1, Freq2, ...) prefer TIM2 or TIM5 when
 *      available.
 *   6. A feature that needs DMA (motors, the LED strip -- see
 *      feature_classifier.js's featureNeedsDma) prefers a timer option
 *      whose pin/AF combination actually offers a DMA stream over one
 *      that doesn't, whenever both are otherwise usable. A pin can list
 *      several AFs where only some support DMA at all (see
 *      timer_dma_lookup.js/MCU-all.json), and dma_allocator.js can only
 *      ever assign DMA to whichever option is chosen *here* -- picking
 *      a non-DMA-capable one for a DMA-needing feature leaves it with
 *      no DMA regardless of anything the DMA allocator itself does.
 *   7. Frequency inputs never use DMA regardless of which base they end
 *      up on, so rule 5's TIM2/TIM5 preference defers to a base no
 *      DMA-needing feature has a DMA-capable option on, whenever one is
 *      available -- otherwise a freq input claiming a base purely for
 *      its own convenience can cost a motor/the LED strip a DMA option
 *      it has no alternative for.
 *   8. S4 -- a helicopter's tail servo, by this tool's own convention
 *      (S1-S3 are the cyclic/swashplate servos, see rule 4) -- prefers
 *      a base other than whichever one(s) S1-S3 ended up on, since a
 *      base's period/prescaler is shared across every channel on it: a
 *      tail servo is often a high-speed digital one needing its own
 *      independent update rate, which sharing a base with the slower
 *      cyclic servos would prevent. Soft preference only, the same
 *      shape as rule 6's DMA preference -- still perfectly fine to
 *      share S1-S3's base if no other option exists for S4 at all.
 *
 * Allocation runs in a fixed order -- freq inputs, LED strip, S1-S3 as
 * a group (then individually if grouping fails), S4 (see rule 8),
 * remaining servos, M1-M4 as a group, remaining motors, then everything
 * else -- so the features with the narrowest options are resolved
 * first, before their preferred bases get taken by something more
 * flexible.
 */

import { classifyFeature, SERVO_GROUP, MOTOR_GROUP } from "./feature_classifier.js";

// A sentinel base owner for a timer+channel claimed by something
// outside this tool's control entirely -- the gyro's clock/sync
// signal, a hardware PPM input, and the like (see timer_dma_lookup.js's
// parseReservedTimers). Deliberately not a real feature type, so rule
// 2's cross-type base exclusivity treats it the same as any other
// foreign owner: no feature this tool manages may share that base,
// full stop, and there's no equivalent of a "same type" exception to
// let one through.
const RESERVED_TYPE = "__reserved__";

/**
 * @typedef {Object} TimerAllocationRow
 * @property {string} feature - The option key, e.g. "M1".
 * @property {string} pin
 * @property {"motor"|"servo"|"freq"|"led"|"other"} type
 * @property {import("./timer_dma_lookup.js").TimerOption[]} options
 * @property {?import("./timer_dma_lookup.js").TimerOption} chosen
 * @property {?string} rule - Why this choice was made, for debugging.
 * @property {boolean} [needsDma] - Passed through unchanged from the
 *   input `features` array (this module only allocates timers, never
 *   DMA) -- see dma_allocator.js's allocateDma, which reads it back
 *   off this same row.
 */

/**
 * Allocates a clash-free timer+channel to every feature that has a
 * pin with timer options.
 * @param {{feature: string, pin: string, options: import("./timer_dma_lookup.js").TimerOption[], needsDma?: boolean}[]} features
 *   needsDma isn't used by this module -- carried through untouched
 *   onto each returned row purely so dma_allocator.js's allocateDma
 *   can read it back off the same row afterwards.
 * @param {Set<string>} [reservedTimers] - Full timer+channel strings
 *   (e.g. "TIM11 CH1") already claimed by something outside this
 *   tool's control -- see timer_dma_lookup.js's parseReservedTimers.
 *   Never offered to any feature, and the whole base each one belongs
 *   to is treated as permanently unavailable too.
 * @returns {TimerAllocationRow[]}
 */
export function allocateTimers(features, reservedTimers = new Set()) {
  const rows = features.map((f) => ({
    ...f,
    type: classifyFeature(f.feature),
    chosen: null,
    rule: null,
  }));

  // Two forms of state accumulate as rows are resolved: every full
  // timer+channel already claimed (rule 1), and which feature type
  // owns each base so far (rule 2).
  const usedFullTimers = new Set();
  const baseOwner = new Map();

  // Seed both with whatever's reserved outside this tool's control,
  // before any of this tool's own rows are considered -- the exact
  // channel is blocked outright, and its whole base is marked owned by
  // RESERVED_TYPE so no other channel on that base can be claimed
  // either (sharing a base means sharing its counter/prescaler, which
  // could interfere with whatever that fixed peripheral needs from it).
  for (const fullTimer of reservedTimers) {
    usedFullTimers.add(fullTimer);
    const base = fullTimer.split(" ")[0];
    if (!baseOwner.has(base)) baseOwner.set(base, RESERVED_TYPE);
  }

  // A base is critical for whichever features have it as their only
  // possible base (rule 3) -- computed once up front, since it only
  // depends on each feature's own option list, not allocation order.
  const criticalOwnersByBase = new Map();
  for (const row of rows) {
    const bases = new Set(row.options.map((o) => o.base).filter(Boolean));
    if (bases.size === 1) {
      const [base] = [...bases];
      if (!criticalOwnersByBase.has(base)) {
        criticalOwnersByBase.set(base, new Set());
      }
      criticalOwnersByBase.get(base).add(row.feature);
    }
  }

  // Every base that offers a DMA-capable option to at least one
  // DMA-needing feature (rule 7) -- computed once up front the same
  // way as criticalOwnersByBase, from every row's full option list
  // regardless of allocation order. Frequency inputs never use DMA
  // themselves (see feature_classifier.js's featureNeedsDma), so a
  // freq input landing on one of these bases purely because rule 5
  // happens to prefer it can silently cost a motor/the LED strip its
  // only remaining DMA-capable choice -- see the freq loop below.
  const dmaRelevantBases = new Set();
  for (const row of rows) {
    if (!row.needsDma) continue;
    for (const opt of row.options) {
      if (opt.base && (opt.dma?.length ?? 0) > 0) {
        dmaRelevantBases.add(opt.base);
      }
    }
  }

  // Whether a row could use a given option right now: not already
  // claimed, its base isn't owned by a different feature type, and
  // (when asked to) it isn't a base critical to some other feature.
  function canUseOption(row, opt, avoidCritical) {
    if (!opt?.base || !opt?.timer) return false;
    if (usedFullTimers.has(opt.timer)) return false;

    const owner = baseOwner.get(opt.base);
    if (owner && owner !== row.type) return false;

    if (avoidCritical) {
      const owners = criticalOwnersByBase.get(opt.base);
      if (owners && !owners.has(row.feature)) return false;
    }

    return true;
  }

  // Records a row's chosen option against the shared claim state so
  // later rows see it as unavailable.
  function registerUsage(row) {
    if (!row.chosen) return;
    usedFullTimers.add(row.chosen.timer);
    if (!baseOwner.has(row.chosen.base)) {
      baseOwner.set(row.chosen.base, row.type);
    }
  }

  // Picks the best remaining option for a single row: preferring a
  // non-negative, DMA-capable, non-clashing candidate when this
  // feature needs DMA (rule 6), then any non-negative non-clashing
  // candidate, or failing that the first non-clashing candidate at
  // all. If literally every option clashes with something else already
  // claimed, assigns the best of them anyway rather than leaving the
  // row with nothing -- a feature always ends up with *something* to
  // show/send as long as it has at least one timer option at all, even
  // if it's one this allocator knows collides with another feature.
  // Downstream code (see timer_dma_reconciler.js's
  // buildTimerDmaCommands) is responsible for noticing that collision
  // and refusing to actually send it, rather than this allocator
  // silently leaving the feature unconfigured, which would read as
  // "nothing wrong here" when something very much still is.
  //
  // avoidBases (rule 8, S4 only) is the same shape of soft preference
  // as rule 6's DMA one: narrows the pool to options whose base isn't
  // in the set, but only when that narrowing actually leaves something
  // -- never at the cost of falling back to the "forced" escape hatch,
  // since avoiding a base is a convenience, not a correctness rule the
  // way avoiding an already-clashing option is.
  function pickBestOption(row, label, avoidCritical = true, avoidBases = new Set()) {
    const candidates = row.options.filter((o) => canUseOption(row, o, avoidCritical));
    const forced = candidates.length === 0 && row.options.length > 0;
    const validPool = forced ? row.options : candidates;
    const preferred = validPool.filter((o) => !avoidBases.has(o.base));
    const pool = !forced && preferred.length > 0 ? preferred : validPool;
    const nonNegative = pool.filter((o) => !o.negative);

    // See rule 6 -- a DMA-capable option is worth preferring over a
    // merely non-negative one whenever this feature actually needs
    // DMA, since this is the only place that choice ever gets made.
    const dmaCapable = row.needsDma
      ? nonNegative.filter((o) => (o.dma?.length ?? 0) > 0)
      : [];

    row.chosen = dmaCapable[0] ?? nonNegative[0] ?? pool[0] ?? null;
    row.rule = forced ? `${label} (forced -- every option clashes)` : label;
    if (row.chosen) registerUsage(row);
  }

  // Backtracking search for a way to give every feature in a group a
  // distinct channel on the same base, none of them already claimed.
  function findUniqueChannelAssignment(optionsByFeature) {
    const features = Object.keys(optionsByFeature);
    // A Map rather than a plain object so the backtracking undo step
    // can remove a feature's tentative choice by key without a
    // dynamically-computed `delete`.
    const assignment = new Map();
    const usedChannels = new Set();

    function backtrack(i) {
      if (i === features.length) return true;
      const f = features[i];
      for (const opt of optionsByFeature[f]) {
        if (!opt.channel || usedChannels.has(opt.channel)) continue;
        if (usedFullTimers.has(opt.timer)) continue;

        usedChannels.add(opt.channel);
        assignment.set(f, opt);
        if (backtrack(i + 1)) return true;
        usedChannels.delete(opt.channel);
        assignment.delete(f);
      }
      return false;
    }

    return backtrack(0) ? assignment : null;
  }

  // Tries to put every *present* member of a preference group (S1-S3,
  // M1-M4) on one shared base with a unique channel each -- a board
  // rarely has all four canonical motor slots occupied at once, so this
  // works on whichever subset of the group actually has a row (at
  // least two, since sharing a base is meaningless for just one), the
  // same way it would for the full group. Only bases every present
  // member has an option on, and whose critical owners (if any) are
  // entirely within the group -- present or not, see canUseOption's own
  // avoidCritical -- are considered -- if none work out, this is a
  // no-op and every present member is left for individual allocation
  // afterwards.
  //
  // Requiring only a subset matters in practice: without it, M1 and M2
  // sharing TIM2 (M1's only possible base, so critical) would never
  // even be attempted whenever M3/M4 don't exist on a board -- M2 would
  // fall straight to individual allocation, where rule 3 excludes TIM2
  // for it (M2 isn't TIM2's critical owner), even though grouping with
  // M1 on distinct channels is exactly the valid arrangement this
  // function exists to find.
  //
  // preferDma (rule 6, M1-M4 only -- servos never need DMA) makes this
  // try every candidate base twice: first restricted to each member's
  // own DMA-capable options only, and only if that fails anywhere does
  // it fall back to the plain, DMA-unaware search. A base that can seat
  // the whole group with DMA to spare is strictly better than one that
  // can't, since dma_allocator.js can only ever assign DMA to whichever
  // channel is chosen here -- but a working, DMA-less assignment is
  // still better than none, so the fallback pass keeps today's
  // behaviour intact when no fully-DMA-capable base exists.
  function tryGroup(groupNames, label, preferDma = false) {
    const groupRows = rows.filter((r) => groupNames.includes(r.feature));
    if (groupRows.length < 2) return;
    const presentNames = groupRows.map((r) => r.feature);

    const optionsByBase = {};
    for (const row of groupRows) {
      for (const opt of row.options) {
        if (!canUseOption(row, opt, false)) continue;
        optionsByBase[opt.base] ??= {};
        optionsByBase[opt.base][row.feature] ??= [];
        optionsByBase[opt.base][row.feature].push(opt);
      }
    }

    const candidateBases = Object.keys(optionsByBase).filter((base) => {
      if (!presentNames.every((name) => optionsByBase[base][name]?.length > 0)) {
        return false;
      }
      const owners = criticalOwnersByBase.get(base);
      return !owners || [...owners].every((o) => groupNames.includes(o));
    });

    for (const requireDma of preferDma ? [true, false] : [false]) {
      for (const base of candidateBases) {
        const perFeature = {};
        let baseUsable = true;
        for (const name of presentNames) {
          const opts = optionsByBase[base][name];
          const nonNegative = opts.filter((o) => !o.negative);
          let pool = nonNegative.length > 0 ? nonNegative : opts;
          if (requireDma) {
            const dmaCapable = pool.filter((o) => (o.dma?.length ?? 0) > 0);
            if (dmaCapable.length === 0) {
              baseUsable = false;
              break;
            }
            pool = dmaCapable;
          }
          perFeature[name] = pool;
        }
        if (!baseUsable) continue;

        const assignment = findUniqueChannelAssignment(perFeature);
        if (assignment) {
          for (const row of groupRows) {
            row.chosen = assignment.get(row.feature);
            row.rule = `${label}: grouped on ${base}`;
            registerUsage(row);
          }
          return;
        }
      }
    }
  }

  // 1) Frequency inputs: unique, prefer TIM2/TIM5, non-negative, avoid
  // critical bases -- resolved first since they have the narrowest
  // preference and the most to lose if a preferred base is taken. As
  // with pickBestOption, falls all the way back to any option at all
  // (even one this allocator knows clashes with something) rather
  // than leaving the row with nothing, if every option is otherwise
  // excluded -- see pickBestOption's own comment for why.
  //
  // Rule 7: within `usable`, a base dmaRelevantBases doesn't list is
  // tried before TIM2/TIM5 preference is even applied, not after --
  // freq never uses DMA regardless of which base it lands on, so
  // there's nothing for it to actually lose by skipping a DMA-capable
  // base, while a motor/the LED strip landing on that same base could
  // lose DMA outright. Only matters when it doesn't cost freq its
  // preferred base anyway: if TIM2/TIM5 aren't DMA-relevant here, or
  // no non-DMA-relevant option exists at all, this changes nothing.
  for (const row of rows.filter((r) => r.type === "freq")) {
    const usable = row.options.filter((o) => canUseOption(row, o, true) && !o.negative);
    const nonDmaRelevant = usable.filter((o) => !dmaRelevantBases.has(o.base));
    const pool = nonDmaRelevant.length > 0 ? nonDmaRelevant : usable;
    const forced = usable.length === 0 && row.options.length > 0;
    row.chosen =
      pool.find((o) => o.base === "TIM2") ??
      pool.find((o) => o.base === "TIM5") ??
      pool[0] ??
      row.options.filter((o) => canUseOption(row, o, true))[0] ??
      (forced ? row.options[0] : null);
    row.rule = forced ? "freq: assigned (forced -- every option clashes)" : "freq: assigned";
    if (row.chosen) registerUsage(row);
  }

  // 2) LED strip: unique, avoid critical bases.
  const ledRow = rows.find((r) => r.type === "led");
  if (ledRow) pickBestOption(ledRow, "LED_STRIP: assigned");

  // 3) S1-S3 as a group, then any of them still unresolved (grouping
  // can fail) individually -- both done before S4 specifically, so
  // rule 8's avoidBases below always sees S1-S3's real, final bases
  // regardless of whether grouping succeeded.
  tryGroup(SERVO_GROUP, "servo S1-S3");
  for (const row of rows.filter((r) => SERVO_GROUP.includes(r.feature) && !r.chosen)) {
    pickBestOption(row, "servo: assigned");
  }

  // 4) S4 (rule 8): prefers a base other than whatever S1-S3 landed on.
  const cyclicBases = new Set(
    rows
      .filter((r) => SERVO_GROUP.includes(r.feature) && r.chosen)
      .map((r) => r.chosen.base),
  );
  const tailRow = rows.find((r) => r.feature === "S4" && !r.chosen);
  if (tailRow) pickBestOption(tailRow, "servo: assigned", true, cyclicBases);

  // 5) Every other servo (S5-S8), individually -- no base preference,
  // this tool has no convention for what they're used for.
  for (const row of rows.filter((r) => r.type === "servo" && !r.chosen)) {
    pickBestOption(row, "servo: assigned");
  }

  // 6) M1-M4 as a group, then whatever's left individually. preferDma
  // (rule 6): unlike S1-S3, motors need DMA.
  tryGroup(MOTOR_GROUP, "motor M1-M4", true);
  for (const row of rows.filter((r) => r.type === "motor" && !r.chosen)) {
    pickBestOption(row, "motor: assigned");
  }

  // 7) Everything else, individually.
  for (const row of rows.filter((r) => r.type === "other" && !r.chosen)) {
    pickBestOption(row, "other: assigned");
  }

  return rows;
}
