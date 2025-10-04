<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import ChannelBar from "./ChannelBar.svelte";
  import Meter from "@/components/Meter.svelte";

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

  function swapAssignment(a, b) {
    const current = FC.RC_MAP[a];
    FC.RC_MAP[FC.RC_MAP.indexOf(b)] = current;
    FC.RC_MAP[a] = b;
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

  @media only screen and (max-width: 480px) {
    .channel-assignment {
      height: 32px;
      line-height: 32px;
    }
  }
</style>
