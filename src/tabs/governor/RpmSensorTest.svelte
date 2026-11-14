<script>
  // Live check of the RPM (frequency) sensor inputs. The FC counts every
  // edge, so a magnet moved past a hall sensor or a shaft turned by hand
  // shows up even far below the speed an RPM reading starts at.
  import { onDestroy, onMount } from "svelte";

  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { setVirtualFreqSensorMagnet } from "@/js/virtual_fc.js";

  const POLL_INTERVAL_MS = 100;
  const PULSE_FLASH_MS = 250;

  let pollerInterval;
  let baseline = $state([]);
  let lastEdges = [];
  let flashing = $state([]);
  const flashTimers = [];

  let ports = $derived(
    FC.FREQ_SENSOR_STATUS.ports
      .map((port, index) => ({ ...port, index }))
      .filter((port) => port.active),
  );

  function pulses(port) {
    return (port.edges - (baseline[port.index] ?? port.edges)) & 0xffff;
  }

  // FREQ input n measures motor n
  const PORT_LABELS = [
    "govRpmSensorMainMotor",
    "govRpmSensorTailMotor",
    "govRpmSensorInput3",
    "govRpmSensorInput4",
  ];

  function resetCount() {
    baseline = FC.FREQ_SENSOR_STATUS.ports.map((port) => port.edges);
  }

  function setMagnet(index, present) {
    setVirtualFreqSensorMagnet(index, present);
    onStatus();
  }

  function onStatus() {
    FC.FREQ_SENSOR_STATUS.ports.forEach((port, index) => {
      baseline[index] ??= port.edges;
      if (lastEdges[index] !== undefined && lastEdges[index] !== port.edges) {
        flashing[index] = true;
        clearTimeout(flashTimers[index]);
        flashTimers[index] = setTimeout(() => {
          flashing[index] = false;
        }, PULSE_FLASH_MS);
      }
      lastEdges[index] = port.edges;
    });
  }

  async function poll() {
    const response = await MSP.promise(MSPCodes.MSP_FREQ_SENSOR_STATUS);
    if (response?.unsupported) {
      clearInterval(pollerInterval);
      return;
    }
    onStatus();
  }

  onMount(() => {
    poll();
    pollerInterval = setInterval(poll, POLL_INTERVAL_MS);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
    flashTimers.forEach(clearTimeout);
  });
</script>

{#if FC.FREQ_SENSOR_STATUS.supported}
  <Section label="govSectionRpmSensor" summary="govRpmSensorSummary">
    {#if ports.length === 0}
      <SubSection>
        <p class="note">{$i18n.t("govRpmSensorNone")}</p>
      </SubSection>
    {/if}
    {#each ports as port (port.index)}
      <SubSection label={PORT_LABELS[port.index]}>
        {#snippet actions()}
          <button class="link-btn" onclick={resetCount}>
            {$i18n.t("govRpmSensorReset")}
          </button>
        {/snippet}
        <div class="row">
          <span class={["led", flashing[port.index] && "on"]} aria-hidden="true"
          ></span>
          {#if pulses(port) > 0}
            <span class="status ok">
              {$i18n.t("govRpmSensorWorking", { pulses: pulses(port) })}
            </span>
          {:else}
            <span class="status">{$i18n.t("govRpmSensorWaiting")}</span>
          {/if}
        </div>
        <div class="row detail">
          <span>{$i18n.t("govRpmSensorLevel")}</span>
          <span class="level">
            {$i18n.t(port.pinHigh ? "govRpmSensorHigh" : "govRpmSensorLow")}
          </span>
          {#if CONFIGURATOR.virtualMode}
            <div class="grow"></div>
            <button
              class="btn"
              onpointerdown={() => setMagnet(port.index, true)}
              onpointerup={() => setMagnet(port.index, false)}
              onpointerleave={() => setMagnet(port.index, false)}
            >
              {$i18n.t("govRpmSensorSimulate")}
            </button>
          {/if}
        </div>
      </SubSection>
    {/each}
  </Section>
{/if}

<style lang="scss">
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
  }

  .detail {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .led {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: var(--color-neutral-300);
    transition: background-color var(--animation-speed);

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-700);
    }

    &.on {
      background-color: var(--color-success);
      box-shadow: 0 0 6px var(--color-success);
    }
  }

  .status.ok {
    color: var(--color-success);
    font-weight: 600;
  }

  .level {
    font-weight: 600;
    color: var(--color-text);
  }

  .note {
    padding: 4px 8px;
    margin: 0;
    color: var(--color-text-muted);
  }

  .grow {
    flex-grow: 1;
  }

  .link-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    color: var(--color-accent-500);
  }

  .btn {
    @extend %button;
    padding: 4px 10px;
    user-select: none;
    touch-action: none;
  }
</style>
