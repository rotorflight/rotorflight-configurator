<script>
  let {
    id,
    value = $bindable(),
    options = [],
    disabled = false,
    // Number of rows to show at once. Omitted (undefined) gives the
    // normal collapsed dropdown; a value greater than 1 renders an
    // expanded, always-open listbox instead.
    size,
    onchange,
    onblur,
  } = $props();
</script>

<select
  {id}
  bind:value
  {disabled}
  {size}
  onchange={(e) => onchange?.(e)}
  onblur={(e) => onblur?.(e)}
>
  {#each options as option (option.value)}
    <!-- disabled + hidden lets a caller pass a placeholder entry (e.g.
         "Set Option") that shows while it's the current value but can't
         be chosen and isn't listed among the real options. -->
    <option
      value={option.value}
      disabled={option.disabled}
      hidden={option.hidden}>{option.label}</option
    >
  {/each}
</select>
