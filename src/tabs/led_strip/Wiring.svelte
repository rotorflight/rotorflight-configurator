<script>
  import { i18n } from "@/js/i18n.js";

  import {
    ledState,
    toggleWireMode,
    wireClearAll,
    wireClearSelected,
  } from "./state.svelte.js";
</script>

<div class="section">{$i18n.t("ledStripWiring")}</div>
<button
  class="btn wide"
  class:active={ledState.wireMode}
  onclick={toggleWireMode}
>
  {$i18n.t("ledStripWiringMode")}
</button>
<div class="row">
  <button class="btn half" onclick={wireClearSelected}>
    {$i18n.t("ledStripWiringClearControl")}
  </button>
  <button class="btn half" onclick={wireClearAll}>
    {$i18n.t("ledStripWiringClearAllControl")}
  </button>
</div>
<p class="hint">{$i18n.t("ledStripWiringMessage")}</p>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .section {
    margin: 16px 0 6px;
    padding-bottom: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-soft);
    border-bottom: 1px solid var(--color-border);
  }

  .wide {
    width: 100%;

    &.active {
      background: rgb(15, 171, 22);
      color: #fff;
    }
  }

  .row {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .half {
    flex: 1;
  }

  .hint {
    margin: 6px 0 0;
    font-size: 0.7rem;
    color: var(--color-text-soft);
  }
</style>
