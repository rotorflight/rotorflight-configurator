# STM32 WinUSB driver

This directory contains the STM32 bootloader WinUSB INF used by the Rotorflight Configurator Windows installer and Firmware Flasher driver install action.

The INF binds the STM32 ROM DFU bootloader (`USB\\VID_0483&PID_DF11`) to the Microsoft in-box WinUSB driver. Rotorflight firmware flashing uses WinUSB for DFU access on Windows; the legacy ST DFUSe/STTube driver can enumerate the bootloader but prevents the configurator from opening it for flashing.
