# STM32 DFU Driver

This directory contains the official STMicroelectronics STM32 Bootloader / DFU driver package used by the Rotorflight Configurator Windows installer.

## Source

Extracted from the official STMicroelectronics STM32CubeProgrammer driver package.

- Provider: STMicroelectronics
- Device name: STM32 Bootloader
- Device ID: USB\VID_0483&PID_DF11
- Driver type: WinUSB-based STM32 Bootloader / DFU driver
- Driver version: 1.3.0.0
- Driver date: 11/28/2025
- Catalog file: STM32Bootloader.cat
- Device interface GUID: {01105872-BF45-43BE-8B67-3C0F2B8CF0D9}

Only the required Windows driver package files are included in this repository.

The full STM32CubeProgrammer application, command line tools, examples, and unrelated utilities are not bundled.

## Included Files

- STM32Bootloader.inf
- STM32Bootloader.cat

The included `STM32Bootloader.inf` package installs the STM32 Bootloader device using Microsoft's built-in WinUSB driver stack.

## Installation

Rotorflight Configurator can optionally install this driver during the Windows installer flow.

Driver installation is not automatic unless the user selects the STM32 DFU driver installation option during setup.

The driver is installed using the Windows driver installation mechanism from the included STMicroelectronics driver package.

## License

These driver files remain subject to the STMicroelectronics software package license included in the driver INF file.

The included license header identifies the license as:

- SLA0048 Rev3 / October 2017

The Rotorflight Configurator installer requires the user to explicitly opt in and accept the STMicroelectronics driver license before installing the driver.