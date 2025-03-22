<script>
  import { i18n } from "@/js/i18n.js";
  const {
    presetInstance,
    index,
    onEditPresetInstance,
    onDeletePresetInstance,
    onEditPresetComplete,
  } = $props();
</script>

<div class="preset_review_panel">
  <div>
    <div class="preset_name">
      <div class="buttons">
        {presetInstance.presetData.title}

        <button
          onclick={() => onDeletePresetInstance(index)}
          class="button regular-button"
          >{$i18n.t("presetsSourcesDialogDeleteSource")}</button
        >
        <button
          onclick={() =>
            onEditPresetInstance(presetInstance, onEditPresetComplete)}
          class="button regular-button">{$i18n.t("presetEdit")}</button
        >
      </div>
    </div>
    <div>
      <strong>{$i18n.t("presetAuthor")}</strong>
      {presetInstance.presetData.author}
    </div>
    <div>
      <strong>{$i18n.t("presetCategory")}</strong>
      {presetInstance.presetData.category}
    </div>
    <div>
      <strong>{$i18n.t("presetSelectedOptions")}</strong><br
      />{presetInstance.optionsValues}
    </div>
  </div>
</div>

<style>
  .preset_review_panel {
    /* background-color: var(--backgroundColor); */
    border: 1px solid var(--subtleAccent);
    padding: 1.5ex;
    box-shadow: 2px 2px 5px rgba(92, 92, 92, 0.25);
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .preset_name {
    font-size: 130%;
    width: 100%;
    display: inline-block;
    vertical-align: middle;
    border-bottom: 1px solid var(--accent);
    line-height: 28px;
    height: 36px;
    font-weight: 300;
    margin-bottom: 5px;
  }

  .buttons {
    display: inline;
    position: static;
    margin-top: 0px;
    padding-bottom: 5px;
  }

  .button {
    float: right;
    margin-top: 0px;
    margin-left: 10px;
    margin-right: 0px;
  }
</style>
