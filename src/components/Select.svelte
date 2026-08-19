<script>
  let {
    id,
    value = $bindable(),
    options = [],
    disabled = false,
    onchange,
  } = $props();
</script>

<select {id} bind:value {disabled} onchange={(e) => onchange?.(e)}>
  {#each options as option (option.value)}
    <option value={option.value}>{option.label}</option>
  {/each}
</select>
