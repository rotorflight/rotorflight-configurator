<script>
  // Generic numbered step indicator for a linear wizard flow. Clicking a
  // step only navigates backwards/to itself -- `onSelect` is expected to be
  // a no-op (or ignored) for any step beyond `current`, since a step that
  // hasn't been reached yet may depend on data the earlier ones produce.
  let { steps = [], current = 1, onSelect } = $props();
</script>

<ol class="steps">
  {#each steps as step, i (step.label)}
    {@const number = i + 1}
    {@const state =
      number === current ? "active" : number < current ? "done" : "upcoming"}
    <li class={["step", state]}>
      <button
        type="button"
        class="marker"
        disabled={number > current}
        onclick={() => onSelect?.(number)}
      >
        {#if state === "done"}
          <em class="fas fa-check" aria-hidden="true"></em>
        {:else}
          {number}
        {/if}
      </button>
      <span class="label">{step.label}</span>
    </li>
  {/each}
</ol>

<style lang="scss">
  .steps {
    display: flex;
    align-items: flex-start;
    list-style: none;
    margin: var(--section-gap) 0;
    padding: 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    min-width: 0;
    position: relative;

    /* Connecting line runs through the middle of every marker except the
       first, drawn behind it via the marker's own z-index. */
    &:not(:first-child)::before {
      content: "";
      position: absolute;
      top: 13px;
      right: 50%;
      width: 100%;
      height: 2px;
      background-color: var(--color-border);
      z-index: 0;
    }

    &.done:not(:first-child)::before {
      background-color: var(--color-accent-500);
    }
  }

  .marker {
    position: relative;
    z-index: 1;
    width: 26px;
    height: 26px;
    min-width: 26px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    color: var(--color-text-soft);

    &:disabled {
      cursor: default;
    }

    .active > & {
      border-color: var(--color-accent-500);
      background-color: var(--color-accent-500);
      color: #fff;
    }

    .done > & {
      border-color: var(--color-accent-500);
      background-color: var(--color-surface);
      color: var(--color-accent-500);
    }
  }

  .label {
    margin-top: 4px;
    font-size: 0.75rem;
    text-align: center;
    color: var(--color-text-soft);
    white-space: nowrap;

    .active > & {
      color: var(--color-text);
      font-weight: 600;
    }
  }

  /* Numbers-only below ~480px -- there's no room for labels alongside three
     markers plus connecting lines at phone width. */
  @media only screen and (max-width: 480px) {
    .label {
      display: none;
    }
  }
</style>
