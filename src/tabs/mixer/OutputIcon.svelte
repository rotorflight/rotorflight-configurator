<script>
  // A servo horn holds a position, so it maps straight onto an angle. A
  // motor doesn't - it spins - so it animates instead, faster the more
  // throttle it's given.
  let { motor = false, angle = 0, spinning = false, speed = 1 } = $props();
</script>

{#if motor}
  <!-- Outrunner seen from the bell end: leads and mounting lugs are
       fixed to the stator, the bell and its cooling vents are what turn.
       Deliberately plain geometry - evenly spaced round vents rather
       than any shaped spoke pattern - so it reads as "a motor" without
       resembling a particular manufacturer's part. -->
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <path class="wire" d="M2 26 H14" />
    <path class="wire" d="M2 32 H14" />
    <path class="wire" d="M2 38 H14" />
    <circle class="can" cx="32" cy="32" r="26" />
    {#each [[14.7, 14.7], [49.3, 14.7], [14.7, 49.3], [49.3, 49.3]] as [cx, cy] (`${cx}-${cy}`)}
      <circle class="lug" {cx} {cy} r="5" />
      <circle class="hole" {cx} {cy} r="2.1" />
    {/each}
    <g
      class="bell"
      class:spinning
      style:animation-duration="{speed}s"
      style:transform-origin="32px 32px"
    >
      <circle class="bell-face" cx="32" cy="32" r="21" />
      {#each [0, 60, 120, 180, 240, 300] as deg (deg)}
        <circle
          class="vent"
          cx="32"
          cy="18"
          r="4.2"
          transform="rotate({deg} 32 32)"
        />
      {/each}
      <circle class="hub" cx="32" cy="32" r="9" />
    </g>
    <circle class="shaft" cx="32" cy="32" r="5.5" />
    <circle class="shaft-dot" cx="32" cy="32" r="2.2" />
  </svg>
{:else}
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <rect class="tab" x="0" y="24" width="12" height="16" rx="3" />
    <rect class="tab" x="52" y="24" width="12" height="16" rx="3" />
    {#each [[6, 29], [6, 35], [58, 29], [58, 35]] as [cx, cy] (`${cx}-${cy}`)}
      <circle class="hole" {cx} {cy} r="1.6" />
    {/each}
    <rect class="body" x="10" y="18" width="44" height="28" rx="6" />
    <rect class="lid" x="15" y="23" width="34" height="18" rx="4" />
    {#each [[17, 23], [47, 23], [17, 41], [47, 41]] as [cx, cy] (`${cx}-${cy}`)}
      <circle class="screw" {cx} {cy} r="1.5" />
    {/each}
    <g class="arm" transform="rotate({angle} 32 32)">
      <rect class="horn" x="29" y="10" width="6" height="22" rx="3" />
      <circle class="ball" cx="32" cy="12" r="3" />
    </g>
    <circle class="shaft" cx="32" cy="32" r="5" />
    <circle class="shaft-dot" cx="32" cy="32" r="2" />
  </svg>
{/if}

<style lang="scss">
  .tab,
  .lug {
    fill: var(--color-border);
    stroke: var(--color-text-soft);
    stroke-width: 1;
  }

  .hole {
    fill: var(--color-surface);
    stroke: var(--color-text-soft);
    stroke-width: 0.75;
  }

  .body,
  .can {
    fill: var(--color-surface);
    stroke: var(--color-text-soft);
    stroke-width: 1.5;
  }

  .lid {
    fill: var(--color-border);
    opacity: 0.5;
  }

  .screw {
    fill: var(--color-text-soft);
    opacity: 0.6;
  }

  .shaft {
    fill: var(--color-text);
  }

  .shaft-dot {
    fill: var(--color-surface);
  }

  .horn,
  .ball,
  .bell-face,
  .hub {
    fill: var(--color-accent-500);
    stroke: var(--color-text);
    stroke-width: 0.75;
  }

  /* Copper is the one literal colour in either icon - it's what makes a
     motor read as a motor, and it sits legibly on both themes. */
  .vent {
    fill: #b87333;
  }

  /* transform-box: view-box makes transform-origin resolve against the
     viewBox, so the bell turns about its own centre rather than the
     SVG's origin. */
  .bell {
    transform-box: view-box;
  }

  .bell.spinning {
    animation-name: spin;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
