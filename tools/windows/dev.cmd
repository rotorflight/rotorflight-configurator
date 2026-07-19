@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SETUP=%SCRIPT_DIR%setup-dev.ps1"
set "PS_START=%SCRIPT_DIR%start-dev.ps1"

if /I "%~1"=="" goto up
if /I "%~1"=="help" goto help
if /I "%~1"=="setup" goto setup
if /I "%~1"=="start" goto start
if /I "%~1"=="start-reset" goto start_reset
if /I "%~1"=="up" goto up

echo Unknown command: %~1
echo.
goto help

:setup
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SETUP%"
exit /b %ERRORLEVEL%

:start
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_START%"
exit /b %ERRORLEVEL%

:start_reset
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_START%" -ResetNwCache
exit /b %ERRORLEVEL%

:up
call "%~f0" setup
if errorlevel 1 exit /b %ERRORLEVEL%
call "%~f0" start
exit /b %ERRORLEVEL%

:help
echo Rotorflight Windows helper wrapper
echo.
echo Usage:
echo   dev.cmd setup        - prepare local environment
echo   dev.cmd start        - launch dev stack
echo   dev.cmd start-reset  - clear NW.js cache and launch
echo   dev.cmd up           - setup then launch ^(default^)
exit /b 1
