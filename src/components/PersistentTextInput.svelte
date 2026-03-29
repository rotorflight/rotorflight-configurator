<script module>
  let idcount = 0;
</script>
<script>
  import * as config from "@/js/config.js";

  let {
    value = $bindable(),
    i18n,
    persistName,
    defaultValue,
    onchange = undefined
  } = $props();

  value = persistName
    ? config.get(persistName) ?? defaultValue
    : defaultValue;

  function inonchange(event) {
    if (persistName) {
      config.set({ [persistName]: value });
    }
    onchange?.(event);
  }

  const id = `persistenttextinput${idcount}`;
</script>
<label for={id}>
  <span {i18n}> </span>
  <input {id} type="text" bind:value onchange={inonchange} />
</label>
