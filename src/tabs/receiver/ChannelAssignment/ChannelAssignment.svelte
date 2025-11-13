<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import ChannelBar from "./ChannelBar.svelte";
  import Field from "@/components/Field.svelte";
  import Meter from "@/components/Meter.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  const channelNames = [
    "controlAxisRoll",
    "controlAxisPitch",
    "controlAxisYaw",
    "controlAxisCollective",
    "controlAxisThrottle",
    "controlAxisAux1",
    "controlAxisAux2",
    "controlAxisAux3",
    "controlAxisAux4",
    "controlAxisAux5",
    "controlAxisAux6",
    "controlAxisAux7",
    "controlAxisAux8",
    "controlAxisAux9",
    "controlAxisAux10",
    "controlAxisAux11",
    "controlAxisAux12",
    "controlAxisAux13",
    "controlAxisAux14",
    "controlAxisAux15",
    "controlAxisAux16",
    "controlAxisAux17",
    "controlAxisAux18",
    "controlAxisAux19",
    "controlAxisAux20",
    "controlAxisAux21",
    "controlAxisAux22",
    "controlAxisAux23",
    "controlAxisAux24",
    "controlAxisAux25",
    "controlAxisAux26",
    "controlAxisAux27",
  ];

  const rssiOptions = [
    { value: 0, text: "rssiOptionAUTO" },
    { value: 1, text: "rssiOptionADC" },
    { value: 6, text: "controlAxisAux1" },
    { value: 7, text: "controlAxisAux2" },
    { value: 8, text: "controlAxisAux3" },
    { value: 9, text: "controlAxisAux4" },
    { value: 10, text: "controlAxisAux5" },
    { value: 11, text: "controlAxisAux6" },
    { value: 12, text: "controlAxisAux7" },
    { value: 13, text: "controlAxisAux8" },
    { value: 14, text: "controlAxisAux9" },
    { value: 15, text: "controlAxisAux10" },
    { value: 16, text: "controlAxisAux11" },
    { value: 17, text: "controlAxisAux12" },
    { value: 18, text: "controlAxisAux13" },
    { value: 19, text: "controlAxisAux14" },
    { value: 20, text: "controlAxisAux15" },
    { value: 21, text: "controlAxisAux16" },
    { value: 22, text: "controlAxisAux17" },
    { value: 23, text: "controlAxisAux18" },
    { value: 24, text: "controlAxisAux19" },
    { value: 25, text: "controlAxisAux20" },
    { value: 26, text: "controlAxisAux21" },
    { value: 27, text: "controlAxisAux22" },
    { value: 28, text: "controlAxisAux23" },
    { value: 29, text: "controlAxisAux24" },
    { value: 30, text: "controlAxisAux25" },
    { value: 31, text: "controlAxisAux26" },
    { value: 32, text: "controlAxisAux27" },
  ];

  const presets = [
    { label: "ELRS", map: [0, 1, 3, 2, 5, 4, 6, 7] },
    { label: "FrSky", map: [0, 1, 3, 4, 2, 5, 6, 7] },
    { label: "Futaba / Hitec", map: [0, 1, 3, 5, 2, 4, 6, 7] },
    { label: "Spektrum / Graupner / JR", map: [1, 2, 3, 5, 0, 4, 6, 7] },
  ];

  let selectedPreset = $derived.by(() => {
    // check if FC.RC_MAP matches a preset map
    outer: for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      for (let j = 0; j < preset.map.length; j++) {
        if (preset.map[j] !== FC.RC_MAP[j]) {
          continue outer;
        }
      }

      return i;
    }

    return "";
  });

  function applyPreset(e) {
    const preset = presets[Number(e.target.value)];
    FC.RC_MAP = [...preset.map];
  }

  function swapAssignment(channel, channelFunction) {
    // RC_MAP is transposed

    const oldChannelFunction = FC.RC_MAP.indexOf(channel);
    const swapChannel = FC.RC_MAP[channelFunction];

    FC.RC_MAP[channelFunction] = channel;
    FC.RC_MAP[oldChannelFunction] = swapChannel;
  }

  let selectedRssiSource = $derived.by(() => {
    if (FC.FEATURE_CONFIG.features.RSSI_ADC) {
      return 1;
    }

    if (FC.RSSI_CONFIG.channel > 5) {
      return FC.RSSI_CONFIG.channel;
    }

    return 0;
  });

  let rssiPercent = $derived((FC.ANALOG.rssi / 1023) * 100);
</script>

<Section label="receiverBars">
  <SubSection>
    <Field id="receiver-channel-order-preset" label="receiverChannelOrder">
      <select
        id="receiver-channel-order-preset"
        onchange={applyPreset}
        value={selectedPreset}
      >
        <option value="" disabled selected>
          {$i18n.t("receiverChannelOrderPresetPlaceholder")}
        </option>
        {#each presets as preset, i (preset.label)}
          <option value={i}>{preset.label}</option>
        {/each}
      </select>
    </Field>
  </SubSection>

  <div class="divider"></div>

  <SubSection>
    <div class="channel-group">
      {#each { length: FC.RC_MAP.length } as _, i (i)}
        <span class="channel-index">{i + 1}</span>
        <select
          bind:value={() => FC.RC_MAP.indexOf(i), (x) => swapAssignment(i, x)}
        >
          {#each channelNames.slice(0, FC.RC_MAP.length) as channel, i (i)}
            <option value={i}>{$i18n.t(channel)}</option>
          {/each}
        </select>
        <ChannelBar channel={i} />
      {/each}
      {#each { length: Math.min(FC.RC.active_channels, 18) - FC.RC_MAP.length } as _, i (i)}
        {@const channel = i + FC.RC_MAP.length}
        <span class="channel-index">{channel + 1}</span>
        <span class="channel-assignment">{$i18n.t(channelNames[channel])}</span>
        <ChannelBar {channel} />
      {/each}
      <div class="rssi-group">
        <span class="channel-index">RSSI</span>
        <select
          bind:value={
            () => selectedRssiSource,
            (x) => {
              FC.FEATURE_CONFIG.features.RSSI_ADC = x === 1;
              FC.RSSI_CONFIG.channel = x > 5 ? x : 0;
            }
          }
        >
          {#each rssiOptions.slice(0, FC.RC.active_channels - 3) as rssiOpt (rssiOpt.value)}
            <option value={rssiOpt.value}>{$i18n.t(rssiOpt.text)}</option>
          {/each}
        </select>
        <Meter
          leftLabel={FC.ANALOG.rssi}
          value={rssiPercent}
          rightLabel={`${rssiPercent.toFixed(0)}%`}
        />
      </div>
    </div>
  </SubSection>
</Section>

<style lang="scss">
  .channel-group {
    display: grid;
    grid-template-columns: auto auto 1fr;
    column-gap: var(--section-gap);
    row-gap: 8px;
    align-items: center;
    padding: 4px;
  }

  .channel-index {
    text-align: right;
  }

  .channel-assignment {
    padding-left: 8px;
  }

  .rssi-group {
    margin-top: 16px;
    display: grid;
    align-items: center;
    grid-column: 1/-1;
    grid-template-columns: subgrid;
  }

  .divider {
    margin: 0px 2px 16px 2px;

    :global(html[data-theme="light"]) & {
      border-bottom: 1px solid var(--color-neutral-400);
    }

    :global(html[data-theme="dark"]) & {
      border-bottom: 1px solid var(--color-neutral-700);
    }
  }

  @media only screen and (max-width: 480px) {
    .channel-assignment {
      height: 32px;
      line-height: 32px;
    }
  }
</style>
