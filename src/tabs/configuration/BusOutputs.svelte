<script>
  import diff from "microdiff";
  import { onMount } from "svelte";

  import BusOut from "./BusOut.svelte";

  let { onchange } = $props();
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      SBUS_OUT: FC.SBUS_OUT,
      FBUS_OUT: FC.FBUS_OUT,
    });
  }

  onMount(() => {
    initialState = snapshotState();
  });

  $effect(() => {
    const changes = diff(initialState, snapshotState());
    if (changes.length > 0) {
      onchange?.();
    }
  });

  function hasPortFunction(fn) {
    for (const port of FC.SERIAL_CONFIG.ports) {
      for (const fnName of port.functions) {
        if (fnName === fn) {
          return true;
        }
      }
    }

    return false;
  }
</script>

{#if hasPortFunction("SBUS_OUT")}
  <BusOut busType="SBUS_OUT" />
{/if}

{#if hasPortFunction("FBUS_OUT")}
  <BusOut busType="FBUS_OUT" />
{/if}

<style lang="scss">
</style>
