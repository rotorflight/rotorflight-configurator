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
    height: 20px;
    max-height: 20px;
    min-height: 20px;

    -webkit-tap-highlight-color: transparent;
  }

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background-color: var(--color-switch);

      &::before {
        transform: translateX(24px);
        background-color: var(--color-switch-handle);
      }
    }

    &:checked + .slider.disabled {
      background-color: var(--color-switch-disabled-checked);

      &::before {
        background-color: var(--color-switch-handle-disabled);
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
    border-radius: var(--radius-pill);
    transition:
      background-color var(--animation-speed),
      box-shadow var(--animation-speed);

    &.disabled {
      cursor: not-allowed;

      background-color: var(--color-switch-disabled);

      &::before {
        background-color: var(--color-switch-handle-disabled);
      }
    }

    &::before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: var(--color-switch-handle-secondary);
      border-radius: 50%;
      /* Springy overshoot on the knob - the one place in the app where a
         control is worth animating with character rather than linearly. */
      transition:
        transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1),
        background-color var(--animation-speed);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    input:focus-visible + & {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }
  }
</style>
