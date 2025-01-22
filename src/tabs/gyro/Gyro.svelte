<script>
  import semver from "semver";
  import { onMount } from "svelte";
  import diff from "microdiff";
  import { FC } from "@/js/fc.svelte.js";

  import RpmFilter from "./RpmFilter.svelte";
  import CustomNotches from "./CustomNotches.svelte";

  import {
    parseRpmFilterConfig1,
    parseRpmFilterConfig2,
    generateRpmFilterConfig1,
    generateRpmFilterConfig2,
  } from "./filter_config.js";

  const { onRpmSettingsUpdate, onRpmNotchUpdate } = $props();

  let notches = $state(null);
  let enabled = $derived(FC.FEATURE_CONFIG.features.RPM_FILTER);
  let custom = $derived.by(() => {
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      return enabled && FC.FILTER_CONFIG.rpm_preset === 0;
    }

    return enabled;
  });

  let initialState;
  let initialNotchState;

  function parseNotches() {
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      notches = parseRpmFilterConfig2($state.snapshot(FC.RPM_FILTER_CONFIG_V2));
    } else {
      notches = parseRpmFilterConfig1($state.snapshot(FC.RPM_FILTER_CONFIG));
    }
  }

  onMount(() => {
    parseNotches();
    initialNotchState = $state.snapshot(notches);
    initialState = $state.snapshot({
      config: FC.FILTER_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  });

  $effect(() => {
    if (!notches) {
      return;
    }

    const currentState = $state.snapshot(notches);

    let config;
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      config = generateRpmFilterConfig2(notches);
      FC.RPM_FILTER_CONFIG_V2 = config;
    } else {
      config = generateRpmFilterConfig1(notches);
      FC.RPM_FILTER_CONFIG = config;
    }

    if (currentState) {
      const changed =
        !initialNotchState || diff(initialNotchState, currentState).length > 0;
      const valid = !!config;
      onRpmNotchUpdate(changed, valid);
    }
  });

  $effect(() => {
    onRpmSettingsUpdate(
      diff(initialState, {
        config: FC.FILTER_CONFIG,
        features: FC.FEATURE_CONFIG.features.bitfield,
      }).length > 0,
    );
  });

  function onResetNotches() {
    FC.RPM_FILTER_CONFIG = [];
    FC.RPM_FILTER_CONFIG_V2 = [{}, {}, {}];
    parseNotches();
  }
</script>

<div class="container">
  <RpmFilter {FC} {notches} />
  {#if custom}
    <CustomNotches {FC} {notches} {onResetNotches} />
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
