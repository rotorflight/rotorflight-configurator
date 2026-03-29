<script>
  import { CONFIGURATOR } from "@/js/configurator.svelte";
  import SmallToggle from "@/components/SmallToggle.svelte";
  import DarkDropdown from "@/components/DarkDropdown.svelte";
  import PersitentTextInput from "@/components/PersistentTextInput.svelte";
  import { getInterfaces, DeviceType } from "@/js/comms";

  /** Local constants **/
  const DEFAULT_BAUD = "115200";
  const virtualFirmwareVersions = [
    { fw: "4.3.0", msp: "12.6.0", label: "Rotorflight 2.0.x" },
    { fw: "4.4.0", msp: "12.7.0", label: "Rotorflight 2.1.x" },
    { fw: "4.5.0", msp: "12.8.0", label: "Rotorflight 2.2.x" },
    { fw: "4.6.0", msp: "12.9.0", label: "Rotorflight 2.3.x" },
  ];

  /** Reactives **/
  let autoConnect = $state(false);
  let showAllPorts = $state(false);
  let portOverride = $state();
  let baudRate = $state(DEFAULT_BAUD);
  let virtualFirmware = $state();

  let ifacedevs = $state([]);

  /** Deriveds and Event Handlers **/
  let omniOptions = $derived.by(() => {
    if (ifacedevs.length == 0) {
      return [{ value: {}, i18n: "serialPortLoading" }];
    } else {
      const options = ifacedevs
        .map(({ iface, devices, kind }) => {
          const devOptions = devices.map((dev) => ({
            value: kind === "dfu" ? { dfu: dev } : { serial: dev },
            text: dev.description,
          }));

          // Add a permission request action for interfaces that require it
          if (iface.requiresPermission) {
            devOptions.push({
              value: { command: () => iface.requestPermission(showAllPorts) },
              i18n:
                kind === "dfu"
                  ? "portsSelectDfuPermission"
                  : "portsSelectPermission",
            });
          }

          return devOptions;
        })
        .flat();

      return options;
    }
  });

  // When the omnidrop changes, update app state to the selected device
  // or execute an action and reset the selected value.
  let selectedOption = $state();
  let lastSelected;
  function omniChanged() {
    if (!selectedOption) {
      selectedOption = omniOptions[0]?.value;
      console.log(
        "PortPicker: omniChanged — no selection, defaulting to first option",
      );
    }
    if (selectedOption.serial) {
      console.log(
        `PortPicker: selected serial device: ${selectedOption.serial.description} (type=${selectedOption.serial.type})`,
      );
      CONFIGURATOR.serial = selectedOption.serial;
      CONFIGURATOR.dfu = undefined;
    } else if (selectedOption.dfu) {
      console.log("PortPicker: selected DFU device");
      CONFIGURATOR.serial = undefined;
      CONFIGURATOR.dfu = selectedOption.dfu;
    } else if (selectedOption.command) {
      console.log(
        "PortPicker: executing command action (e.g. permission request)",
      );
      const command = selectedOption.command;
      selectedOption = lastSelected || omniOptions[0];
      command();
    } else {
      console.log(
        "PortPicker: omniChanged — unrecognized option",
        selectedOption,
      );
    }
    lastSelected = selectedOption;
  }

  // Auto-select first real (standard/dfu) device when options change.
  // Clear selection when the selected device disappears.
  $effect(() => {
    // Check if current selection is still present in options (compare by device, not wrapper)
    if (selectedOption?.serial || selectedOption?.dfu) {
      const sel = selectedOption.serial || selectedOption.dfu;
      const stillPresent = omniOptions.some(
        (o) =>
          (o.value?.serial && o.value.serial === sel) ||
          (o.value?.dfu && o.value.dfu === sel),
      );
      if (!stillPresent) {
        console.log("PortPicker: selected device removed, clearing selection");
        selectedOption = undefined;
        CONFIGURATOR.serial = undefined;
        CONFIGURATOR.dfu = undefined;
      }
    }

    const currentType = selectedOption?.serial?.type;
    const hasRealSelection =
      currentType === DeviceType.Standard ||
      currentType === DeviceType.DFU ||
      selectedOption?.dfu;

    const firstReal = omniOptions.find((o) => {
      const t = o.value?.serial?.type;
      return t === DeviceType.Standard || t === DeviceType.DFU || o.value?.dfu;
    });

    if (firstReal && !hasRealSelection) {
      console.log(
        `PortPicker: auto-selecting device: ${firstReal.value.serial?.description || "DFU"}`,
      );
      selectedOption = firstReal.value;
      omniChanged();
    }
  });

  function autoConnectChanged() {
    baudRate = DEFAULT_BAUD;
    CONFIGURATOR.baudRate = parseInt(baudRate);
  }

  // Sync local state to CONFIGURATOR when values change
  $effect(() => {
    CONFIGURATOR.baudRate = parseInt(baudRate);
  });
  $effect(() => {
    CONFIGURATOR.portOverride = portOverride;
  });
  $effect(() => {
    CONFIGURATOR.virtualFirmware = virtualFirmware;
  });

  // Shared interface list, populated on init. Each entry: { iface, kind: "serial"|"dfu" }
  let allIfaces = [];

  async function refreshDevices() {
    if (allIfaces.length === 0) return;
    console.log(
      `PortPicker: refreshing devices (showAllPorts=${showAllPorts})`,
    );
    ifacedevs = await Promise.all(
      allIfaces.map(({ iface, kind }) =>
        iface.getDevices(showAllPorts).then((devices) => {
          console.log(
            `PortPicker: ${iface.constructor.name} returned ${devices.length} device(s):`,
            devices.map((d) => d.description),
          );
          return { iface, devices, kind };
        }),
      ),
    );
  }

  // Re-fetch devices when showAllPorts changes
  $effect(() => {
    showAllPorts;
    refreshDevices();
  });

  // Initialize the port list and setup device change subscriptions
  (async function () {
    console.log("PortPicker: waiting for appReadySemaphore...");
    await CONFIGURATOR.appReadySemaphore;
    console.log("PortPicker: appReady, loading interfaces...");

    allIfaces = await getInterfaces();
    console.log(`PortPicker: got ${allIfaces.length} interface(s)`);

    await refreshDevices();

    // Subscribe to device changes (connect/disconnect/permission granted)
    for (const { iface, kind } of allIfaces) {
      iface.devicesChanged((devices) => {
        console.log(
          `PortPicker: devicesChanged from ${iface.constructor.name}, ${devices.length} device(s):`,
          devices.map((d) => d.description),
        );
        ifacedevs = ifacedevs.map((id) =>
          id.iface === iface ? { iface, devices, kind } : id,
        );
      });
    }
  })();
</script>

<div
  id="port-override-option"
  style:display={CONFIGURATOR.serial?.type !== DeviceType.Manual ? "none" : ""}
>
  <PersitentTextInput
    i18n="portOverrideText"
    bind:value={portOverride}
    defaultValue="/dev/rfcomm0"
    persistName="portOverride"
  />
  <!--
<label for="port-override">
    <span i18n="portOverrideText">Port:</span>
    <input id="port-override" type="text" value="/dev/rfcomm0"/>
</label>
-->
</div>

<div
  id="firmware-virtual-option"
  style:display={CONFIGURATOR.serial?.type !== DeviceType.Virtual ? "none" : ""}
>
  <DarkDropdown
    i18n_title="virtualMSPVersion"
    options={virtualFirmwareVersions
      .reverse()
      .map((value) => ({ value, text: value.label }))}
    bind:value={virtualFirmware}
    onchange={() => alert(virtualFirmware)}
  />
  <!--
<div class="dropdown dropdown-dark">
    <select id="firmware-version-dropdown" class="dropdown-select" i18n_title="virtualMSPVersion"></select>
</div>
-->
</div>
<div id="portsinput">
  <!-- 
<div class="dropdown dropdown-dark">
    <select class="dropdown-select" id="port" i18n_title="firmwareFlasherManualPort">
        <option value="loading" i18n="serialPortLoading">Loading</option>
    </select>
</div>
-->
  <DarkDropdown
    i18n_title="firmwareFlasherManualPort"
    options={omniOptions}
    onchange={omniChanged}
    bind:value={selectedOption}
  />
  <div id="auto-connect-and-baud">
    <SmallToggle
      label="autoConnect"
      persistName="auto_connect"
      defaultChecked={true}
      bind:checked={autoConnect}
      onchange={autoConnectChanged}
    />
    <SmallToggle
      label="showAllPorts"
      persistName="show_all_ports"
      defaultChecked={false}
      bind:checked={showAllPorts}
    />
    <div
      id="baudselect"
      style:display={CONFIGURATOR.serial?.type === DeviceType.DFU ? "none" : ""}
    >
      <DarkDropdown
        bind:value={baudRate}
        disabled={autoConnect}
        i18n_title="firmwareFlasherBaudRate"
      >
        <option>1000000</option>
        <option>500000</option>
        <option>250000</option>
        <option>115200</option>
        <option>57600</option>
        <option>38400</option>
        <option>28800</option>
        <option>19200</option>
        <option>14400</option>
        <option>9600</option>
        <option>4800</option>
        <option>2400</option>
        <option>1200</option>
      </DarkDropdown>
      <!--
<div class="dropdown dropdown-dark">
    <select class="dropdown-select" id="baud" i18n_title="firmwareFlasherBaudRate">
        <option>1000000</option>
        <option>500000</option>
        <option>250000</option>
        <option>115200</option>
        <option>57600</option>
        <option>38400</option>
        <option>28800</option>
        <option>19200</option>
        <option>14400</option>
        <option>9600</option>
        <option>4800</option>
        <option>2400</option>
        <option>1200</option>
    </select>
</div>
-->
    </div>
  </div>
</div>

<style>
  #auto-connect-and-baud {
    display: flex;
    align-items: baseline;
    gap: 25px;
    justify-content: flex-end;
  }

  #firmware-virtual-option {
    height: 76px;
    width: 180px;
    margin-right: 15px;
    margin-top: 16px;
  }

  #port-override-option {
    height: 76px;
    margin-top: 24px;
    margin-right: 15px;
  }

  #port-override-option :global(label) {
    background-color: #2b2b2b;
    border-radius: 3px;
    padding: 3px;
    color: var(--subtleAccent);
  }

  #port-override-option :global(input) {
    background-color: rgba(0, 0, 0, 0.1);
    color: #888888;
    width: 140px;
    margin-left: 2px;
    padding: 1px;
    border-radius: 3px;
    height: 15px;
    font-size: 12px;
  }
</style>
