@echo off
rem Builds the Morpholex iOS app and installs it on the connected iPhone.
rem For Windows with WSL and xtool set up (see ios\README.md). Double-click it, or run it
rem from a terminal. Plug in and unlock the iPhone first.
title Morpholex - build and install

rem This script sits in ios\scripts; ask WSL for the Linux path of the ios folder above it.
set "PROJECT="
for /f "delims=" %%i in ('wsl wslpath -a "%~dp0.."') do set "PROJECT=%%i"
if not defined PROJECT (
    echo Could not reach WSL. Install WSL and xtool first - see ios\README.md.
    goto done
)

rem xtool reaches the iPhone through Apple's service, which only runs while Apple Devices is open.
tasklist /FI "IMAGENAME eq AppleDevices.exe" 2>nul | find /I "AppleDevices.exe" >nul
if errorlevel 1 (
    echo Starting Apple Devices...
    start "" explorer.exe "shell:AppsFolder\AppleInc.AppleDevices_nzyj5cx40ttqa!App"
)

echo Waiting for Apple's iPhone service...
set /a WAITED=0
:wait_for_service
netstat -an | find "127.0.0.1:27015" | find "LISTENING" >nul
if not errorlevel 1 goto service_ready
if %WAITED% GEQ 30 (
    echo.
    echo Apple's iPhone service did not start. Open Apple Devices manually and try again.
    goto done
)
timeout /t 1 /nobreak >nul
set /a WAITED+=1
goto wait_for_service

:service_ready
echo.
echo Make sure the iPhone is plugged in and unlocked.
echo.
wsl --cd "%PROJECT%" -- bash -lc "export USBMUXD_SOCKET_ADDRESS=127.0.0.1:27015; xtool dev"

if errorlevel 1 (
    echo.
    echo Something went wrong - read the messages above.
) else (
    echo.
    echo Done! Morpholex is installed on the iPhone.
)

:done
echo.
pause
