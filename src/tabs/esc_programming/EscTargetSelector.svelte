<script>
  import { i18n } from "@/js/i18n.js";

  import escState from "./state.svelte.js";
</script>

<h2>{$i18n.t("escProgrammingSelectEsc")}</h2>
<div class="grid">
  <button
    class="esc-btn"
    onclick={() => escState.selectEsc(0)}
    disabled={escState.armed}
  >
    {$i18n.t("escProgrammingEsc1")}
  </button>
  <button
    class="esc-btn"
    onclick={() => escState.selectEsc(1)}
    disabled={escState.armed || !escState.escTwoAvailable}
  >
    {$i18n.t("escProgrammingEsc2")}
  </button>
</div>
<button class="back-btn" onclick={() => escState.reset()}>
  {$i18n.t("escProgrammingBack")}
</button>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
    padding: 8px;
  }

  .esc-btn,
  .back-btn {
    @extend %button;
    padding: 16px 8px;
  }
</style>
