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
    <div class="header">
      <span class="title">{presetInstance.presetData.title}</span>
      <button
        onclick={() =>
          onEditPresetInstance(presetInstance, onEditPresetComplete)}
        class="button regular-button">{$i18n.t("presetEdit")}</button
      >
      <button
        onclick={() => onDeletePresetInstance(index)}
        class="button regular-button"
        >{$i18n.t("presetsSourcesDialogDeleteSource")}</button
      >
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

  .header {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 130%;
    border-bottom: 1px solid var(--accent);
    line-height: 28px;
    height: 36px;
    font-weight: 300;
    margin-bottom: 5px;
  }

  .title {
    flex-grow: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .button {
    height: 24px;
    line-height: 24px;
    margin: 0;
  }
</style>
