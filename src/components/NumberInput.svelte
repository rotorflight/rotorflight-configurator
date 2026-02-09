<script>
  import { onMount, onDestroy } from "svelte";

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
    max-width: 120px;
  }

  input {
    padding: 0 8px;
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
    width: 1.5rem;
    min-width: 1.5rem;
    font-size: 0.5rem;

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
    border-top-left-radius: 2px;
    border-bottom-left-radius: 2px;
    border-right: none;
  }

  .inc {
    border-top-right-radius: 2px;
    border-bottom-right-radius: 2px;
    border-left: none;
  }

  .container input:focus {
    border-color: var(--color-border-accent);
  }

  @media only screen and (max-width: 480px) {
    input {
      height: 2rem;
      line-height: 2rem;
      text-align: center;
      font-size: 0.8rem !important;
    }

    .dec,
    .inc {
      height: 2rem;
      width: 2rem;
      min-width: 2rem;
    }
  }
</style>
