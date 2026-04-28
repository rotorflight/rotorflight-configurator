# STM32 DFU Driver

This directory contains the STM32 DFU driver used by the Rotorflight Configurator Windows installer.

## Source

Extracted from the official STMicroelectronics DfuSe package:

- Package: DfuSe USB Device Firmware Upgrade
- Version: v3.0.6
- Driver version: 3.0.6.1
- Driver date: 04/26/2018
- Provider: STMicroelectronics

Original install location:

C:\Program Files (x86)\STMicroelectronics\Software\DfuSe v3.0.6\

## Included Files

- STtube.inf
- sttube.cat
- x64/STTub30.sys
- x86/STTub30.sys

Only the required driver files are included. The ST installer and utilities are not bundled.

## License

The license terms are included in STtube.inf.

The Rotorflight Configurator installer requires the user to explicitly opt in and accept the STMicroelectronics driver license before installing the driver.