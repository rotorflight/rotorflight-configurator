<script>
  import Select from "@/components/Select.svelte";

  import { i18n } from "@/js/i18n.js";

  import SensorGraph from "./SensorGraph.svelte";

  let {
    subtitle,
    rateOptions,
    rate = $bindable(),
    scaleOptions,
    scale = $bindable(),
    readouts,
    series,
    xDomain,
    yDomain,
  } = $props();
</script>

<div class="panel">
  <div class="control">
    {#if subtitle}
      <div class="subtitle">{subtitle}</div>
    {/if}
    {#if rateOptions}
      <div class="row">
        <span class="dt">{$i18n.t("sensorsRefresh")}</span>
        <Select bind:value={rate} options={rateOptions} />
      </div>
    {/if}
    {#if scaleOptions}
      <div class="row">
        <span class="dt">{$i18n.t("sensorsScale")}</span>
        <Select bind:value={scale} options={scaleOptions} />
      </div>
    {/if}
    {#each readouts as readout (readout.label)}
      <div class="row">
        <span class="dt">{readout.label}</span>
        <span class="dd {readout.cls}">{readout.value}</span>
      </div>
    {/each}
  </div>
  <div class="graph-wrap">
    <SensorGraph {series} {xDomain} {yDomain} />
  </div>
</div>

<style lang="scss">
  .panel {
    display: flex;
    gap: 10px;
  }

  .control {
    flex: 0 0 160px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
  }

  .subtitle {
    font-weight: 600;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .dt {
    font-weight: 600;
    color: var(--color-text-soft);
  }

  .dd {
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    color: #fff;
    font-size: 0.7rem;
    text-align: right;

    &.x {
      background-color: #00a8f0;
    }

    &.y {
      background-color: #c0d800;
    }

    &.z {
      background-color: #cb4b4b;
    }
  }

  .graph-wrap {
    flex: 1;
    min-width: 0;
    height: 140px;
  }

  @media only screen and (max-width: 575px) {
    .panel {
      flex-direction: column;
    }

    .control {
      flex: none;
      flex-direction: row;
      flex-wrap: wrap;
    }

    .row {
      flex: 1 1 auto;
    }
  }
</style>
