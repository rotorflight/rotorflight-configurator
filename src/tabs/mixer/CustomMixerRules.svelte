<script>
  import { onMount } from "svelte";

  import HoverTooltip from "@/components/HoverTooltip.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import {
    OP_SET,
    anyOutputAvailable,
    builtinOutputSet,
    computeRuleGroups,
    enforceOperInvariant,
    isConfiguredOutput,
    normalizeRuleGroups,
    regroupRule,
    visibleRuleCount,
  } from "./rules.js";

  let { onchange } = $props();

  let origRules = Mixer.cloneRules(FC.MIXER_RULES);

  // Normalise what the FC gave us before anything is drawn: rules can
  // arrive ungrouped, or with a hole punched in the middle by the CLI,
  // and every index-based assumption below depends on neither being
  // true. Both run unconditionally - the second fixes up which rule is
  // marked Set, which the first can change - so they can't be combined
  // into a short-circuiting ||.
  const regrouped = normalizeRuleGroups(FC.MIXER_RULES);
  const reopered = enforceOperInvariant(FC.MIXER_RULES);

  // If either changed something, the FC's copy no longer matches ours,
  // so the tab needs to be able to save the difference. Deferred to
  // mount rather than called here, where the prop's initial value is
  // all that's captured.
  onMount(() => {
    if (regrouped || reopered) onchange?.();
  });

  // FC.MIXER_RULES is $state (fc.svelte.js), so it's a deep proxy -
  // splices and per-rule field writes are tracked, and everything
  // derived from it here re-runs on its own.
  let rules = $derived(FC.MIXER_RULES);

  let count = $derived(visibleRuleCount(rules));
  let groups = $derived(computeRuleGroups(rules, count));
  let builtin = $derived(builtinOutputSet(FC.MIXER_CONFIG));

  let servoCount = $derived(FC.CONFIG.servoCount);
  let motorCount = $derived(FC.CONFIG.motorCount);

  let hasSpareOutput = $derived(
    anyOutputAvailable(builtin, servoCount, motorCount),
  );

  // A trailing blank row is offered whenever there's both a free slot and
  // somewhere for a new rule to point. Editing any field in it commits it.
  let showBlankRow = $derived(count < rules.length && hasSpareOutput);

  let inputOptions = $derived(
    Mixer.inputNames.map((name, value) => ({ value, label: $i18n.t(name) })),
  );

  let operOptions = $derived(
    Mixer.operNames.map((name, value) => ({ value, label: $i18n.t(name) })),
  );

  function exists(dst) {
    return isConfiguredOutput(dst, servoCount, motorCount);
  }

  /**
   * Outputs offered for one row. Anything the board doesn't have, or that
   * the built-in swash/tail mixing already drives, is left out -- except
   * the row's own current output, which stays listed even when it fails
   * both tests, so a rule set up elsewhere is never silently reset.
   */
  function outputOptions(currentDst) {
    const options = [];

    Mixer.outputNames.forEach((name, index) => {
      if (index !== currentDst && (!exists(index) || builtin.has(index)))
        return;
      options.push({ value: index, label: $i18n.t(name) });
    });

    // outputNames is sparse (nothing for Servo 9-26), so a rule pointing
    // into that range has no entry above. Keep it selectable with a
    // generic label rather than leaving the dropdown with no match.
    if (currentDst > 0 && !Mixer.outputNames[currentDst]) {
      options.push({ value: currentDst, label: `#${currentDst}` });
    }

    return options;
  }

  /**
   * Operators offered for one row. Only the first rule for an output may
   * be Set; later ones may be anything but. A row with no output yet has
   * no such restriction, since it drives nothing.
   */
  function operOptionsFor(index, rule) {
    const firstForOutput = rule.dst === 0 || !!groups.groupStart[index];
    if (rule.dst === 0) return operOptions;
    return operOptions.filter((o) => (o.value === OP_SET) === firstForOutput);
  }

  function collides(rule) {
    return builtin.has(rule.dst) && rule.oper === OP_SET;
  }

  let anyCollision = $derived(
    rules.slice(0, count).some((rule) => collides(rule)),
  );
  let anyMissing = $derived(
    rules.slice(0, count).some((rule) => rule.dst !== 0 && !exists(rule.dst)),
  );

  function touched() {
    onchange?.();
  }

  /**
   * A blank row's underlying rule is all zeroes, which does nothing.
   * Show Set and a full-scale weight as the starting point without
   * writing them, so touching any other field commits a rule that
   * actually has an effect rather than a silently inert one.
   */
  function blankDefaults(rule) {
    return {
      oper: rule.oper || OP_SET,
      weight: rule.weight || 1000,
    };
  }

  function commit(index, rule, outputChanged) {
    const wasBlank = Mixer.isNullRule(FC.MIXER_RULES[index]);

    Object.assign(FC.MIXER_RULES[index], rule);

    if (wasBlank || outputChanged) {
      regroupRule(FC.MIXER_RULES, index);
    } else {
      enforceOperInvariant(FC.MIXER_RULES);
    }

    touched();
  }

  function removeRule(index) {
    // Keep the array compacted: drop the slot and pad a fresh null onto
    // the end. Nothing is sent here -- it's staged until save.
    FC.MIXER_RULES.splice(index, 1);
    FC.MIXER_RULES.push(Mixer.nullRule());
    enforceOperInvariant(FC.MIXER_RULES);
    touched();
  }

  function swap(a, b) {
    const r = FC.MIXER_RULES;
    [r[a], r[b]] = [r[b], r[a]];
    enforceOperInvariant(r);
    touched();
  }

  // Which output a rule belongs to is decided automatically, so moving
  // one only makes sense within its own group -- reordering Set/Add/Mul
  // against each other, where the sequence changes the result. Past the
  // group's edge it would just get regrouped straight back.
  function canMoveUp(index) {
    return index > 0 && rules[index - 1].dst === rules[index].dst;
  }

  function canMoveDown(index) {
    return index < count - 1 && rules[index + 1].dst === rules[index].dst;
  }

  export async function sendDirty() {
    for (let index = 0; index < FC.MIXER_RULES.length; index++) {
      if (Mixer.compareRule(FC.MIXER_RULES[index], origRules[index])) continue;
      await new Promise((resolve) => mspHelper.sendMixerRule(index, resolve));
    }
    origRules = Mixer.cloneRules(FC.MIXER_RULES);
  }

  // Re-reads the FC's own copy rather than replaying a local snapshot:
  // edits here are only ever staged, so whatever the FC still holds is
  // by definition the state being reverted to.
  export async function revert() {
    await MSP.promise(MSPCodes.MSP_MIXER_RULES);
    normalizeRuleGroups(FC.MIXER_RULES);
    enforceOperInvariant(FC.MIXER_RULES);
    origRules = Mixer.cloneRules(FC.MIXER_RULES);
  }
</script>

<!-- Tooltip only renders the help text; HoverTooltip is what actually
     shows and positions it (see Field.svelte, which pairs them the same
     way). Used directly here because these label a table's columns
     rather than a Field's single input. -->
{#snippet helpHeader(label, help)}
  <span class="with-help">
    <HoverTooltip {tooltip}>
      {$i18n.t(label)}
    </HoverTooltip>
    {#snippet tooltip()}
      <Tooltip {help} />
    {/snippet}
  </span>
{/snippet}

<Section label="mixerCustomRules" summary="mixerCustomRulesHelp">
  {#if anyCollision}
    <div class="note">
      <WarningNote message="mixerCustomRuleCollisionNote" />
    </div>
  {/if}
  {#if anyMissing}
    <div class="note">
      <WarningNote message="mixerCustomRuleMissingOutputNote" />
    </div>
  {/if}

  <div class="table">
    <div class="head row">
      <span>#</span>
      <span>{$i18n.t("mixerRuleOutput")}</span>
      <span>{$i18n.t("mixerRuleInput")}</span>
      {@render helpHeader("mixerRuleOper", "mixerRuleOperHelp")}
      {@render helpHeader("mixerRuleOffset", "mixerRuleOffsetHelp")}
      {@render helpHeader("mixerRuleWeight", "mixerRuleWeightHelp")}
      <span></span>
    </div>

    {#each rules.slice(0, count) as rule, index (index)}
      {@const missing = rule.dst !== 0 && !exists(rule.dst)}
      <div
        class="row"
        class:group-start={groups.groupStart[index]}
        class:invalid={collides(rule) || missing}
      >
        <span class="index">{index + 1}</span>
        <Select
          value={rule.dst}
          options={outputOptions(rule.dst)}
          onchange={(e) => commit(index, { dst: Number(e.target.value) }, true)}
        />
        <Select
          value={rule.src}
          options={inputOptions}
          onchange={(e) => commit(index, { src: Number(e.target.value) })}
        />
        <Select
          value={rule.oper}
          options={operOptionsFor(index, rule)}
          onchange={(e) => commit(index, { oper: Number(e.target.value) })}
        />
        <NumberInput
          value={rule.offset}
          min={-2500}
          max={2500}
          step={10}
          onchange={(e) => commit(index, { offset: Number(e.target.value) })}
        />
        <NumberInput
          value={rule.weight}
          min={-10000}
          max={10000}
          step={10}
          onchange={(e) => commit(index, { weight: Number(e.target.value) })}
        />
        <span class="actions">
          <button
            class="link"
            disabled={!canMoveUp(index)}
            title={$i18n.t("mixerRuleMoveUpHelp")}
            onclick={() => swap(index, index - 1)}>&#9650;</button
          >
          <button
            class="link"
            disabled={!canMoveDown(index)}
            title={$i18n.t("mixerRuleMoveDownHelp")}
            onclick={() => swap(index, index + 1)}>&#9660;</button
          >
          <button
            class="link del"
            title={$i18n.t("mixerRuleDeleteHelp")}
            onclick={() => removeRule(index)}>&#10005;</button
          >
        </span>
      </div>
    {/each}

    {#if showBlankRow}
      {@const blank = FC.MIXER_RULES[count]}
      {@const defaults = blankDefaults(blank)}
      <div class="row blank">
        <span class="index"></span>
        <Select
          value={blank.dst}
          options={outputOptions(blank.dst)}
          onchange={(e) =>
            commit(count, { ...defaults, dst: Number(e.target.value) }, true)}
        />
        <Select
          value={blank.src}
          options={inputOptions}
          onchange={(e) =>
            commit(count, { ...defaults, src: Number(e.target.value) })}
        />
        <Select value={defaults.oper} options={operOptions} disabled />
        <NumberInput
          value={blank.offset}
          min={-2500}
          max={2500}
          step={10}
          disabled
        />
        <NumberInput
          value={defaults.weight}
          min={-10000}
          max={10000}
          step={10}
          disabled
        />
        <span class="actions"></span>
      </div>
    {:else if count < rules.length}
      <div class="empty">
        <InfoNote message="mixerNoSpareOutput" />
      </div>
    {/if}
  </div>

  <p class="count">{count} / {rules.length}</p>
</Section>

<style lang="scss">
  .note {
    padding: 0 4px 8px;
  }

  .table {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: grid;
    grid-template-columns: 28px minmax(110px, 1fr) minmax(
        130px,
        1.4fr
      ) 90px 90px 90px 72px;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }

  .head {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .with-help {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* Each output's rules read as one group: a separator only between
     groups, matching how the config sections above separate their own
     groups of related settings. */
  .row.group-start:not(:nth-child(2)) {
    border-top: 1px solid var(--color-border-soft);
  }

  .index {
    font-weight: 600;
  }

  /* A rule that can't work -- it Sets an output the built-in mixing
     already drives, or points at one this board doesn't have. */
  .row.invalid {
    box-shadow: inset 3px 0 0 var(--color-red-500, crimson);
  }

  .row.blank {
    opacity: 0.6;

    &:focus-within,
    &:hover {
      opacity: 1;
    }
  }

  .empty {
    padding: 4px 8px 8px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
  }

  .link {
    background: none;
    border: none;
    padding: 2px;
    font-size: 0.7rem;
    cursor: pointer;
    color: var(--color-text-muted);

    &:hover:not(:disabled) {
      color: var(--color-text);
    }

    &:disabled {
      opacity: 0.25;
      cursor: default;
    }

    &.del {
      font-size: 0.85rem;

      &:hover {
        color: var(--color-red-500, crimson);
      }
    }
  }

  .count {
    margin: 0;
    padding: 4px 8px 0;
    text-align: right;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  @media only screen and (max-width: 480px) {
    .row {
      grid-template-columns: 1fr 1fr;
    }

    .head {
      display: none;
    }
  }
</style>
