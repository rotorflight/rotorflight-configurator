<script>
  import { i18n } from "@/js/i18n.js";
  import SelectedPresetPanel from "@/tabs/presets/selected_preset_panel.svelte";
  let {
    presetInstances,
    onCancelButtonClicked,
    onApplyButtonClicked,
    onEditPresetInstance,
  } = $props();
  let selectedPresetInstancesLength = $state(presetInstances.length);
  function onDeletePresetInstance(index) {
    presetInstances.splice(index, 1);
    selectedPresetInstancesLength = presetInstances.length;
    if (presetInstances.length === 0) {
      onCancelButtonClicked();
    }
  }
  function onEditPresetComplete() {
    selectedPresetInstancesLength = presetInstances.length + Date.now();
  }
</script>

<dialog id="presets_review_dialog" onclose={onCancelButtonClicked}>
  {#key selectedPresetInstancesLength}
    <div id="review_presets_dialog_content_wrapper">
      <div class="review_presets_dialog_title_panel tab_title">
        {$i18n.t("reviewPresetsDialogTitle")}
      </div>
      <div class="review_presets_dialog_scrollable">
        <div class="note">{$i18n.t("presetsReviewBeforeApply")}</div>
        <div class="review_presets_dialog_presets">
          {#each presetInstances as presetInstance, index}
            <SelectedPresetPanel
              {presetInstance}
              {index}
              {onDeletePresetInstance}
              {onEditPresetInstance}
              {onEditPresetComplete}
            />
          {/each}
        </div>
      </div>

      <div class="content_toolbar">
        <div class="btn">
          <button
            onclick={onApplyButtonClicked}
            class="regular-button"
            target="_blank"
            rel="noopener noreferrer"
            >{$i18n.t("presetsButtonReviewCLI")}</button
          >
          <button
            onclick={onCancelButtonClicked}
            class="regular-button"
            target="_blank"
            rel="noopener noreferrer">{$i18n.t("close")}</button
          >
        </div>
      </div>
    </div>
  {/key}
</dialog>

<style>
  #review_presets_dialog_content_wrapper {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
  }

  .review_presets_dialog_title_panel {
    margin: 0;
  }

  .review_presets_dialog_scrollable {
    padding: 12px;
    overflow-y: auto;
    height: 100%;
  }

  #presets_review_dialog {
    padding: 0px;
    max-height: 100%;
  }
</style>
