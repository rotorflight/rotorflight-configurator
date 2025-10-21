<script>
  let { title, leftLabel, rightLabel, value, max } = $props();
</script>

<div>
  <div class="top-container">
    <div class="title grow">{title}</div>
    <div>{max}</div>
  </div>
  <div class="meter">
    <div class="left-label">{leftLabel}</div>
    <div class="right-label">{rightLabel}</div>
    <div class="fill" style:width={`${(value ?? 0).clamp(0, 100)}%`}></div>
  </div>
</div>

<style lang="scss">
  *,
  *::before,
  *::after {
    box-sizing: content-box;
  }

  .meter {
    position: relative;
    height: 20px;
    border-radius: 2px;
    container-type: size;
    color: var(--color-text);
    background-color: var(--color-meter-bg);
    border: 1px solid var(--color-meter-border);
  }

  .left-label {
    position: absolute;
    height: 20px;
    line-height: 20px;
    font-weight: 600;
    z-index: 1;
    left: 8px;
  }

  .right-label {
    position: absolute;
    height: 20px;
    line-height: 20px;
    font-weight: 600;
    z-index: 1;
    right: 8px;
  }

  .fill {
    position: absolute;
    height: 20px;
    border-radius: 2px;
    margin-left: -1px;
    margin-top: -1px;
    border-width: 1px;
    border-style: solid;
    transition: width 0.1s linear;

    :global(html[data-theme="light"]) & {
      background: hsl(var(--fill-hue, var(--val-accent-hue)), 70%, 70%);
      border-color: hsl(var(--fill-hue, var(--val-accent-hue)), 70%, 40%);
    }

    :global(html[data-theme="dark"]) & {
      background: hsl(var(--fill-hue, var(--val-accent-hue)), 40%, 40%);
      border-color: hsl(var(--fill-hue, var(--val-accent-hue)), 60%, 50%);
    }
  }

  .title {
    font-weight: 600;
  }

  .top-container {
    display: flex;
  }
</style>
