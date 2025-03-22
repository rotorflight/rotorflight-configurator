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
      <div id="review_presets_dialog_content">
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
  .review_presets_dialog_title_panel {
    padding-bottom: 0.5ex;
    margin-bottom: 2ex;
  }
  .review_presets_dialog_scrollable {
    position: absolute;
    bottom: 51px;
    padding: 20px 20px 51px 20px; /* main.css turn the padding back on */
    overflow-y: auto;
    overflow-x: hidden;
    height: 350px;
  }

  @media all and (max-width: 575px) {
    #review_presets_dialog_content_wrapper .content_toolbar {
      position: fixed;
    }

    .review_presets_dialog_scrollable {
      overflow-y: auto;
      overflow-x: hidden;
      padding-bottom: 51px;
      height: unset;
    }
  }
  #presets_review_dialog {
    width: 900px;
    height: 520px;
    padding: 0px; /* main.css defines a padding of 1em but we want to turn this off so the title/footer bar looks nice */
  }
  #presets_review_dialog .content_toolbar {
    position: absolute;
    bottom: 0; /* lock footer to the bottom of the dialog */
  }
</style>
