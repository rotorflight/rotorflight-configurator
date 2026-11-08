<!-- A toggle switch on a radio, flicking back and forth: "flick the switch
     now". Decorative; the prompt next to it says the same. -->
<svg
  viewBox="0 0 40 48"
  class="switch-flick"
  aria-hidden="true"
  focusable="false"
>
  <rect class="plate" x="6" y="30" width="28" height="14" rx="4" />
  <g class="lever">
    <line class="arm" x1="20" y1="36" x2="20" y2="8" />
    <circle class="tip" cx="20" cy="8" r="4" />
  </g>
  <circle class="pivot" cx="20" cy="36" r="3.5" />
</svg>

<style lang="scss">
  .switch-flick {
    display: block;
    width: 34px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .plate {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.5;
  }

  .lever {
    transform-origin: 20px 36px;
    animation: flick 1.4s ease-in-out infinite;
  }

  .arm {
    stroke: currentColor;
    stroke-width: 3.5;
    stroke-linecap: round;
  }

  .tip {
    fill: var(--color-accent-500);
  }

  .pivot {
    fill: currentColor;
  }

  @keyframes flick {
    0%,
    35% {
      transform: rotate(-28deg);
    }

    50%,
    85% {
      transform: rotate(28deg);
    }

    100% {
      transform: rotate(-28deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lever {
      animation: none;
      transform: rotate(28deg);
    }
  }
</style>
