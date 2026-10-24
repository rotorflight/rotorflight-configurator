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
    BUS_SOURCE_MIXER,
    busLabelFor,
    busServoCount,
    busServosActive,
    pwmServoCount,
  } from "@/js/servoLayout.js";

  import {
    OP_SET,
    allOutputs,
    anyOutputAvailable,
    builtinOutputSet,
    busChannelsNeedingMixer,
    computeRuleGroups,
    enforceOperInvariant,
    isConfiguredOutput,
    normalizeRuleGroups,
    outputLabel,
    regroupRule,
    visibleRuleCount,
  } from "./rules.js";

  let { onchange } = $props();

  // The table works in fixed slots: a row's position is its real
  // firmware slot index. Mixer.RULE_COUNT is the authority on how many
  // there are (it matches firmware's MIXER_RULE_COUNT) rather than
  // whatever length the last MSP read happened to produce - padding
  // here means the blank row always has a slot to write into, and
  // sendDirty() always has an original to compare against.
  function padToCapacity() {
    while (FC.MIXER_RULES.length < Mixer.RULE_COUNT) {
      FC.MIXER_RULES.push(Mixer.nullRule());
    }
  }

  padToCapacity();

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

  // Which outputs this board actually has. Not just FC.CONFIG.servoCount:
  // that counts bus servos too once the bus is running, while the three
  // kinds of output sit at fixed index ranges that a single total can't
  // describe. See servoLayout.js.
  let busActive = $derived(
    busServosActive(FC.CONFIG.apiVersion, FC.SERIAL_CONFIG?.ports),
  );

  let layout = $derived({
    pwmServos: pwmServoCount(
      busActive,
      FC.SERVO_CONFIG?.length ?? 0,
      FC.CONFIG.servoCount,
    ),
    busServos: busServoCount(busActive),
    motors: FC.CONFIG.motorCount,
    // Which bus channels follow the mixer rather than the RX, and what
    // to call the bus in labels ("SBUS"/"FBUS", or "" for both).
    busSources: FC.BUS_SERVO_CONFIG,
    busLabel: busLabelFor(FC.SERIAL_CONFIG?.ports),
  });

  let hasSpareOutput = $derived(anyOutputAvailable(builtin, layout));

  // Bus channels a rule drives that still pass the RX through. Firmware
  // defaults channels 9-18 -- the ones only the bus has -- to RX, and
  // nothing else in the UI can change that, so saving switches them to
  // Mixer (see sendDirty).
  let busChannelsToSwitch = $derived(busChannelsNeedingMixer(rules, layout));

  // A trailing blank row is offered whenever there's both a free slot and
  // somewhere for a new rule to point. Editing any field in it commits it.
  let showBlankRow = $derived(count < Mixer.RULE_COUNT && hasSpareOutput);

  let inputOptions = $derived(
    Mixer.inputNames.map((name, value) => ({ value, label: $i18n.t(name) })),
  );

  // Which input dropdown is currently open, so only that one shows full
  // labels. A native select renders the selected option's own text when
  // closed - there's no separate display label - so the only way to show
  // "Ch Aux 2" collapsed but "RC Channel AUX2" in the list is to swap
  // the option text while the list is down.
  //
  // Driven by mousedown/keydown rather than focus: focus outlives the
  // open list, so a select left merely focused - which is what it is
  // right after you pick something - kept showing full names and undid
  // the abbreviation exactly where the column is tightest. Cleared on
  // change as well as blur, so making a choice returns it to the short
  // form straight away.
  let expandedInput = $state(null);

  // Abbreviations for the closed select only; the open list keeps every
  // input's full name (see inputSelect). The closed line is the one that
  // has to fit a column narrow enough to sit beside the config sections,
  // and "RC Channel"/"Commanded" are pure prefix - the word that
  // actually identifies the input is the last one.
  //
  // Matched against the translated label rather than keyed off the input
  // index, so a locale whose names don't start with these simply keeps
  // them in full: wider than ideal, but never wrong or mistranslated.
  // The stabilized inputs ("Roll", "Collective", ...) carry no prefix
  // and are already short, so nothing here touches them.
  const INPUT_ABBREVIATIONS = [
    [/^RC Channel /, "Ch "],
    [/^Commanded /, "Cmd "],
  ];

  function shortInput(label) {
    let short = label;

    for (const [prefix, replacement] of INPUT_ABBREVIATIONS) {
      if (prefix.test(short)) {
        short = short.replace(prefix, replacement);
        break;
      }
    }

    // "AUX2" -> "Aux 2". The firmware's own all-caps run reads as
    // shouting beside the abbreviations above, and the digit needs
    // separating once "Channel" is no longer there to do it.
    return short.replace(/\bAUX(\d+)\b/, "Aux $1");
  }

  let operOptions = $derived(
    Mixer.operNames.map((name, value) => ({ value, label: $i18n.t(name) })),
  );

  function exists(dst) {
    return isConfiguredOutput(dst, layout);
  }

  /**
   * Outputs offered for one row. Anything the board doesn't have, or that
   * the built-in swash/tail mixing already drives, is left out -- except
   * the row's own current output, which stays listed even when it fails
   * both tests, so a rule set up elsewhere is never silently reset.
   */
  function outputOptions(currentDst) {
    const options = allOutputs()
      .filter(
        (index) =>
          index === currentDst || (exists(index) && !builtin.has(index)),
      )
      .map((index) => ({
        value: index,
        label: outputLabel(index, layout, $i18n.t),
      }));

    // A guard, not an expected path: allOutputs() covers every index the
    // firmware can report (0-30), so this only fires for a rule read off
    // an FC that knows an output this build doesn't. Keeping it
    // selectable beats a dropdown with no matching entry, which would
    // silently show the first option instead and rewrite the rule on the
    // next edit.
    if (!options.some((o) => o.value === currentDst)) {
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

  /**
   * For fields bound straight to the rule (offset/weight): the value is
   * already written by the binding, so this only has to re-check the
   * invariant and mark the tab dirty. NumberInput calls onchange with
   * no arguments, so there's nothing to read off an event here.
   */
  function fieldEdited() {
    enforceOperInvariant(FC.MIXER_RULES);
    touched();
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

    // A bus channel left on RX ignores the mixer, so point it at the
    // mixer once a rule drives it. Firmware applies this straight away;
    // the tab's EEPROM write after this keeps it.
    for (const channel of busChannelsToSwitch) {
      await MSP.promise(MSPCodes.MSP_SET_BUS_SERVO_CONFIG, [
        channel,
        BUS_SOURCE_MIXER,
      ]);
      FC.BUS_SERVO_CONFIG[channel] = BUS_SOURCE_MIXER;
    }
  }

  // Re-reads the FC's own copy rather than replaying a local snapshot:
  // edits here are only ever staged, so whatever the FC still holds is
  // by definition the state being reverted to.
  //
  // Same order as on load: snapshot the FC's raw copy first, then
  // normalise. Returns whether normalising changed anything, in which
  // case the FC still differs from the editor and the tab must stay
  // dirty so the fix-up can be saved.
  export async function revert() {
    await MSP.promise(MSPCodes.MSP_MIXER_RULES);
    padToCapacity();
    origRules = Mixer.cloneRules(FC.MIXER_RULES);
    const regrouped = normalizeRuleGroups(FC.MIXER_RULES);
    const reopered = enforceOperInvariant(FC.MIXER_RULES);
    return regrouped || reopered;
  }
</script>

<!-- Tooltip only renders the help text; HoverTooltip is what actually
     shows and positions it (see Field.svelte, which pairs them the same
     way). Used directly here because these label a table's columns
     rather than a Field's single input. -->
{#snippet inputSelect(key, selected, onchange)}
  <select
    value={selected}
    onchange={(e) => {
      expandedInput = null;
      onchange(e);
    }}
    onmousedown={() => (expandedInput = key)}
    onkeydown={() => (expandedInput = key)}
    onblur={() => (expandedInput = null)}
  >
    {#each inputOptions as option (option.value)}
      <option value={option.value}>
        {expandedInput === key ? option.label : shortInput(option.label)}
      </option>
    {/each}
  </select>
{/snippet}

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

<!-- Custom header so the slot count can sit in the bar. Section's own
     header has no room for it, and supplying one disables its built-in
     summary toggle, so the section help becomes a hover tooltip here -
     the same pairing the column headers above use. -->
{#snippet sectionHeader()}
  <div class="section-header">
    <span class="section-title">{$i18n.t("mixerCustomRules")}</span>
    <HoverTooltip tooltip={sectionTip}>
      <span class="section-help fas fa-question-circle"></span>
    </HoverTooltip>
    {#snippet sectionTip()}
      <Tooltip help="mixerCustomRulesHelp" />
    {/snippet}
    <div class="grow"></div>
    <span class="count">{count} / {Mixer.RULE_COUNT}</span>
  </div>
{/snippet}

<Section header={sectionHeader}>
  {#if anyCollision}
    <div class="note-wrap">
      <WarningNote message="mixerCustomRuleCollisionNote" />
    </div>
  {/if}
  {#if anyMissing}
    <div class="note-wrap">
      <WarningNote message="mixerCustomRuleMissingOutputNote" />
    </div>
  {/if}
  {#if busChannelsToSwitch.length > 0}
    <div class="note-wrap">
      <InfoNote message="mixerCustomRuleBusSourceNote" />
    </div>
  {/if}

  <div class="table">
    <div class="head row">
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
        <!-- Only the rule that opens a group names the output; the rest
             are by definition driving the same one, so repeating it adds
             nothing. Later rules keep an empty cell rather than being
             left out, so the grid columns still line up. -->
        {#if groups.groupStart[index]}
          <Select
            value={rule.dst}
            options={outputOptions(rule.dst)}
            onchange={(e) =>
              commit(index, { dst: Number(e.target.value) }, true)}
          />
        {:else}
          <span class="output-continued"></span>
        {/if}
        {@render inputSelect(index, rule.src, (e) =>
          commit(index, { src: Number(e.target.value) }),
        )}
        <Select
          value={rule.oper}
          options={operOptionsFor(index, rule)}
          onchange={(e) => commit(index, { oper: Number(e.target.value) })}
        />
        <NumberInput
          bind:value={rules[index].offset}
          min={-2500}
          max={2500}
          step={10}
          onchange={fieldEdited}
        />
        <NumberInput
          bind:value={rules[index].weight}
          min={-10000}
          max={10000}
          step={10}
          onchange={fieldEdited}
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
        <Select
          value={blank.dst}
          options={outputOptions(blank.dst)}
          onchange={(e) =>
            commit(count, { ...defaults, dst: Number(e.target.value) }, true)}
        />
        {@render inputSelect("blank", blank.src, (e) =>
          commit(count, { ...defaults, src: Number(e.target.value) }),
        )}
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
    {:else if count < Mixer.RULE_COUNT}
      <div class="empty">
        <InfoNote message="mixerNoSpareOutput" />
      </div>
    {/if}
  </div>
</Section>

<style lang="scss">
  /* Section renders a custom header snippet raw - no wrapper of its own
     (see its {@render header()}) - so this has to draw the whole bar.
     @extend rather than a hand-copy of %section-header: the copy that
     was here had drifted badly from it (32px instead of 38px tall, the
     wrong weight and size, no bottom border, and still on the old
     surface colours rather than --color-header-*), leaving this the one
     card on the tab that didn't match. Extending it means it can't
     drift again. */
  .section-header {
    @extend %section-header;

    gap: 8px;
  }

  /* Matches Section's own .title. */
  .section-title {
    padding-left: 8px;
  }

  .section-help {
    font-size: 0.9rem;
    cursor: help;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  .grow {
    flex-grow: 1;
  }

  .count {
    padding-right: 8px;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }

  /* Not called "note": main.css styles that class globally as a legacy
     callout, which would draw a second box around WarningNote's own. */
  .note-wrap {
    padding: 0 4px 8px;
  }

  /* No max-width here any more: every column above is now either
     fixed or capped, so the row can't stretch past ~708px however
     wide the page is, and it simply stays left-aligned under the
     headings.

     overflow-x stays as a backstop. Mixer.svelte sizes its column
     floor from this table so it shouldn't normally be needed, but a
     long translated label can still outgrow the space, and scrolling
     beats bursting out of the panel. */
  .table {
    display: flex;
    flex-direction: column;
    overflow-x: auto;

    /* The row below sizes itself against this box rather than the
       viewport. The same table appears in a half-width column on a
       wide window and across the whole page on a narrow one, so its
       own width is the only thing that actually predicts whether the
       comfortable column sizes fit - the viewport doesn't, and tying
       the page's breakpoint to this table instead kept the config
       sections stretched full width to make room for it. */
    container-type: inline-size;
    container-name: rules;
  }

  /* Offset and Weight are fixed widths: a NumberInput needs room for
     its -/+ buttons either side of four digits, and at 90px the value
     was being clipped.

     Output and Rule are fixed at just enough for their own labels plus
     a dropdown chevron ("Servo 5", "Motor 2"; "Set", "Add", "Mul") -
     below about 70px the chevron gets clipped off entirely. Everything
     left over goes to Controlled by via 1fr, since "RC Channel
     Collective" is far and away the longest label here.

     Controlled by is the only flexible one, and it's capped rather
     than 1fr: as 1fr it swallowed every spare pixel, reaching ~360px
     across a wide page to show labels needing barely half that. 180px
     fits the longest collapsed name ("Commanded Collective"); the
     longer "RC Channel Collective" only appears while the dropdown has
     focus, where the open list shows it in full anyway.

     Everything else is fixed at what its own content needs: Output at
     140px, for "Servo 5 + FBUS 5" (a bus channel mirroring a PWM
     servo), Rule for "Set"/"Add"/"Mul" plus a
     chevron, and Offset and Weight matched at 104px - the pair read as
     one unit, and 96px left a four-digit weight touching its +/-
     buttons. Those total 520px with the gaps and padding, so the table
     runs 670-700px. */
  .row {
    display: grid;
    grid-template-columns: 140px 132px 70px 104px 104px 56px;
    align-items: center;
    gap: 10px;
    padding: 1px 8px;
  }

  /* Tight column: trim what can afford it and give Controlled by the
     remainder. Offset and Weight are deliberately NOT trimmed - they
     keep the same 104px here as above, because a four-digit value is
     exactly what they normally hold (a weight of 1000) and clipping
     that is worse than a shorter name. Names are the one thing allowed
     to truncate; the dropdown still spells them out in full when open.

     Controlled by takes the squeeze, but only down to Output's own
     116px - a dropdown narrower than its neighbour reads as broken
     rather than as tight, and "Cmd Collective" has to stay recognisable
     from its first word. That is the floor, not a soft minimum: at
     ~466px of fixed columns the row needs ~582px, and Mixer.svelte
     gives the card the full page width rather than let it go below.

     Mixer.svelte drops the page to a single column well before that.
     Its margin has to cover Section's own body padding too, which eats
     into the column after the grid maths - too tight a margin and the
     scrollbar came back. */
  @container rules (max-width: 700px) {
    .row {
      grid-template-columns: 116px minmax(116px, 1fr) 58px 104px 104px 42px;
      gap: 6px;
      padding: 1px 6px;
    }
  }

  /* Grid items default to min-width: auto, i.e. they refuse to shrink
     below their own intrinsic width - and a <select> measures itself
     against its *widest option*, not the selected one ("RC Channel
     Collective" here). Without this the selects simply overrode every
     track width above and pushed the table wider than its panel. */
  .row > :global(*) {
    min-width: 0;
  }

  .row :global(select) {
    width: 100%;
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

  /* Rules driving the same output sit tight together (the .row padding
     above) so they read as one block; the gap goes between outputs
     instead, split either side of the separator so the line sits in the
     middle of the space rather than hard against the next rule.
     :nth-child(2) is the first rule row - the header is child 1 - which
     needs no separator above it. */
  .row.group-start:not(:nth-child(2)) {
    margin-top: 9px;
    padding-top: 9px;
    border-top: 1px solid var(--color-border-soft);
  }

  .output-continued {
    display: block;
  }

  /* A rule that can't work -- it Sets an output the built-in mixing
     already drives, or points at one this board doesn't have. */
  .row.invalid {
    box-shadow: inset 3px 0 0 var(--color-red-500, crimson);
  }

  /* Separated from the last group the same way the groups are from each
     other - it isn't part of whichever output happens to be above it. */
  .row.blank {
    margin-top: 9px;
    padding-top: 9px;
    border-top: 1px solid var(--color-border-soft);
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

  /* Deliberately no narrow-viewport override of the grid above.
     Reflowing the six controls into 1fr 1fr pairs and hiding .head
     left Offset and Weight as two unlabelled number boxes - the
     column headings were the only thing naming them. Letting .table
     scroll instead keeps every value next to its own heading, since
     .head is inside that same scroll box and shares the template, so
     the two move together and stay aligned. */
</style>
