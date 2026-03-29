<script>
  import * as config from "@/js/config.js";

  /* eslint-disable no-useless-assignment */
  let {
    label,
    checked = $bindable(false),
    onchange,
    persistName,
    defaultChecked = false
  } = $props();

  // Get initial checked value from persistence or default
  const initvalue = persistName
    ? config.get(persistName) ?? defaultChecked
    : defaultChecked;
  checked = initvalue;

  // Internal state to track the checkbox, update parent binding
  // and optionally config
  let inchecked = $state(initvalue);
  function inonchange(event) {
    checked = inchecked;
    onchange?.(event);
    if (persistName)
      config.set({ [persistName]: inchecked });
  }
  /* eslint-enable no-useless-assignment */

  // Apply switchery iOS styling
  let checkbox;
  $effect(() => 
    new Switchery(checkbox, {
      size: 'small',
      color: 'var(--accent)',
      secondaryColor: 'var(--switcherysecond)',
    })
  );
</script>

<div class="switch-container">
    <label>
        <input bind:this={checkbox} type="checkbox" bind:checked={inchecked} onchange={inonchange} />
        <span i18n="{label}"></span>
    </label>
</div>

<style>
  span {
    color: var(--subtleAccent);
  }
</style>
