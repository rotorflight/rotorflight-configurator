<script>
  import { onDestroy, onMount } from "svelte";

  let {
    value = $bindable(0),
    min: minRaw = 0,
    max: maxRaw = 100,
    step: stepRaw = 1,
    disabled,
    onchange,
    id,
  } = $props();

  let step = $derived(parseFloat(stepRaw));
  let min = $derived(parseFloat(minRaw));
  let max = $derived(parseFloat(maxRaw));

  function precision(a) {
    if (!isFinite(a)) return 0;
    let e = 1,
      p = 0;
    while (Math.round(a * e) / e !== a) {
      e *= 10;
      p++;
    }
    return p;
  }

  let numValue;
  let prec = $derived(precision(step));
  let textValue = $state("");
  let lastGoodTextValue = $state("");
  let timeout = null;
  let interval = null;
  let elem;

  onMount(() => {
    numValue = value;
    textValue = numValue.toFixed(prec);
  });

  onDestroy(() => {
    stopIncrement();
  });

  $effect(() => {
    if (numValue !== value) {
      setVal(value);
    }
  });

  function setVal(v) {
    numValue = v;
    update();
  }

  function inc() {
    setVal(numValue + step);
  }

  function dec() {
    setVal(numValue - step);
  }

  function oninput(e) {
    const allowed = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "-",
      ".",
    ];

    function wip() {
      lastGoodTextValue = textValue;
    }

    function revert() {
      elem.value = lastGoodTextValue;
    }

    // pasted value or backspace/delete
    if (!e.data || e.data.length > 1) {
      return wip();
    }

    if (e.data.length === 1 && !allowed.includes(e.data)) {
      return revert();
    }

    if (elem.value.length === 0 || elem.value === "-") {
      return wip();
    }

    if (
      elem.value === "00" ||
      elem.value === "-00" ||
      elem.value === "." ||
      elem.value === "-." ||
      e.data === "-"
    ) {
      return revert();
    }

    if (e.data === ".") {
      let periodCount = 0;
      for (const c of elem.value) {
        periodCount += c === ".";
        if (periodCount > 1) {
          return revert();
        }
      }
    }

    return wip();
  }

  function update() {
    // Fix NaN
    if (isNaN(numValue)) {
      numValue = 0;
    }

    // Fix Step
    numValue = Math.round(numValue / step) * step;

    // Fix Clamp
    numValue = Math.max(min, Math.min(numValue, max));

    // Fix floating point discrepencies
    textValue = numValue.toFixed(prec);
    lastGoodTextValue = textValue;
    numValue = parseFloat(textValue);

    const changed = value !== numValue;
    value = numValue;
    if (changed && onchange) {
      onchange();
    }
  }

  function updateLocal() {
    numValue = parseFloat(textValue);
    update();
  }

  function onkeydown(e) {
    switch (e.key) {
      case "ArrowUp": {
        inc();
        break;
      }

      case "ArrowDown": {
        dec();
        break;
      }

      default:
        return;
    }

    e.preventDefault();
  }

  function startIncrement(direction) {
    const fn = direction ? inc : dec;
    fn();

    timeout = setTimeout(() => {
      interval = setInterval(() => {
        fn();
      }, 40);
    }, 400);
  }

  function stopIncrement() {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (interval) {
      clearInterval(interval);
    }
  }
</script>

<div class="container">
  <button
    type="button"
    tabindex="-1"
    onpointerdown={() => startIncrement(false)}
    onpointerup={stopIncrement}
    onpointerleave={stopIncrement}
    class="dec fas fa-minus"
    disabled={value <= min || disabled}
    aria-label="decrement"
  ></button>
  <input
    {id}
    type="text"
    inputmode="numeric"
    autocomplete="off"
    bind:this={elem}
    bind:value={textValue}
    {oninput}
    onblur={updateLocal}
    onchange={updateLocal}
    {onkeydown}
    {disabled}
  />
  <button
    type="button"
    tabindex="-1"
    onpointerdown={() => startIncrement(true)}
    onpointerup={stopIncrement}
    onpointerleave={stopIncrement}
    class="inc fas fa-plus"
    disabled={value >= max || disabled}
    aria-label="increment"
  ></button>
</div>

<style lang="scss">
  .container {
    display: flex;
    max-width: var(--number-input-max-width, 120px);
    /* Never let a flex sibling (e.g. an adjustment-badge span in a
       .runtime-control row) squeeze this below its own intended size --
       that silently shrinks the inner <input> (the only child here with
       no min-width of its own) into an unreadable sliver instead of
       making the *row* overflow, which every table using this component
       already wraps in a horizontally-scrollable container for. Sizing
       stays exactly what --number-input-max-width/-height/-btn-size say
       it should be for the current breakpoint, never ambient flex-shrink. */
    flex-shrink: 0;
  }

  input {
    padding: 0 var(--number-input-padding-x, 8px);
    width: 100%;
    transition:
      background-color var(--animation-speed),
      color var(--animation-speed);

    text-align: right;
    line-height: 1.5rem;
    height: 1.5rem;
    font-size: 0.8rem;
    outline: none;
    border-radius: 0;

    &:disabled {
      pointer-events: none;
    }
  }

  .inc,
  .dec {
    @extend %button;

    padding: 0;
    border-radius: 0;
    border-width: 1px;
    border-style: solid;
    height: 1.5rem;
    width: var(--number-input-btn-size, 1.5rem);
    min-width: var(--number-input-btn-size, 1.5rem);
    font-size: 0.6rem;
    /* %button sets 600, but Font Awesome Free only ships its solid glyphs
       (plus/minus) at weight 900 - any other weight renders them blank. */
    font-weight: 900;

    transition:
      background-color var(--animation-speed),
      color var(--animation-speed);

    -webkit-tap-highlight-color: transparent;

    color: var(--color-text);
    background-color: var(--color-input-bg);
    border-color: var(--color-border-soft);

    &:disabled {
      pointer-events: none;

      color: var(--color-text-disabled);
      background-color: var(--color-input-bg-disabled);
    }

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-input-bg-hover);
      }
    }

    &:active {
      background-color: var(--color-input-bg-active);
    }
  }

  .dec {
    border-top-left-radius: var(--radius-sm);
    border-bottom-left-radius: var(--radius-sm);
    border-right: none;
  }

  .inc {
    border-top-right-radius: var(--radius-sm);
    border-bottom-right-radius: var(--radius-sm);
    border-left: none;
  }

  /* The spinner buttons sit flush against the input, so a ring around the
     input alone would be clipped by them - lift the whole group instead. */
  .container:focus-within {
    border-radius: var(--radius-sm);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }

  .container input:focus {
    border-color: var(--color-border-accent);
    box-shadow: none;
  }

  @media only screen and (max-width: 480px) {
    input {
      height: var(--number-input-height, 2rem);
      line-height: var(--number-input-height, 2rem);
      text-align: center;
      font-size: 0.8rem !important;
    }

    .dec,
    .inc {
      height: var(--number-input-height, 2rem);
      width: var(--number-input-btn-size, 2rem);
      min-width: var(--number-input-btn-size, 2rem);
    }
  }
</style>
