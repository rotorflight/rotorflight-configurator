<script>
  let { id, checked = $bindable(), onchange, disabled = false } = $props();
</script>

<label class="container">
  <input
    {id}
    type="checkbox"
    bind:checked
    {disabled}
    onchange={(e) => onchange?.(e)}
  />
  <span class={["slider", disabled && "disabled"]}></span>
</label>

<style lang="scss">
  .container {
    position: relative;
    display: inline-block;
    width: 44px;
    min-width: 44px;
    max-width: 44px;
    height: 16px;
    max-height: 16px;
    min-height: 16px;

    -webkit-tap-highlight-color: transparent;
  }

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background-color: var(--color-switch);

      &::before {
        transform: translateX(28px);
        background-color: var(--color-switch-handle);
      }
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-switch-secondary);
    border-radius: 8px;
    transition: var(--animation-speed);

    &.disabled {
      background-color: var(--color-switch-disabled);

      &::before {
        background-color: var(--color-switch-handle-disabled);
      }
    }

    &::before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 1px;
      bottom: 1px;
      background-color: var(--color-switch-handle-secondary);
      border-radius: 50%;
      transition: var(--animation-speed);

      :global(html[data-theme="light"]) & {
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
      }
    }
  }
</style>
