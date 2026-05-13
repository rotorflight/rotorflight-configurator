@echo off
setlocal

if exist "%windir%\sysnative\pnputil.exe" (
    start "STM32 USB DFU DRIVER" %windir%\sysnative\pnputil.exe -i -a  %0\..\STM32Bootloader.inf
) else (
    start "STM32 USB DFU DRIVER" pnputil -i -a  %0\..\STM32Bootloader.inf
)
endlocal