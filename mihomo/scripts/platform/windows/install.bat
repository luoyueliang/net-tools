@echo off
:: ============================================================
::  mihomo  Windows 安装脚本  install.bat
::  与 install.js 平台惯例一致，提供 Windows 原生安装体验
::
::  用法（在仓库 mihomo\ 目录下，以管理员身份运行推荐）：
::    scripts\platform\windows\install.bat
:: ============================================================
setlocal EnableDelayedExpansion
title mihomo installer

set "REPO_ROOT=%~dp0..\..\..\"
set "INSTALL_DIR=C:\Program Files\mihomo"
set "CONFIG_DIR=%APPDATA%\mihomo"
set "DATA_DIR=%APPDATA%\mihomo\data"
set "LOGS_DIR=%APPDATA%\mihomo\logs"

echo.
echo ==================================================
echo   mihomo installer  [Windows]
echo ==================================================
echo.

:: ── Step 1: Check Node.js ─────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请先安装 v16+：https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%V in ('node -e "process.stdout.write(process.version)"') do set "NODE_VER=%%V"
echo [OK]   Node.js %NODE_VER%

:: ── Step 2: Create config directories ────────────────────
if not exist "%DATA_DIR%" (mkdir "%DATA_DIR%" && echo [OK]   Created %DATA_DIR%)
if not exist "%LOGS_DIR%" (mkdir "%LOGS_DIR%" && echo [OK]   Created %LOGS_DIR%)

:: ── Step 3: Copy config template ─────────────────────────
if not exist "%CONFIG_DIR%\config.yaml" (
    if exist "%REPO_ROOT%config\config.yaml" (
        copy /Y "%REPO_ROOT%config\config.yaml" "%CONFIG_DIR%\config.yaml" >nul
        echo [OK]   Config template copied to %CONFIG_DIR%\config.yaml
        echo [WARN] Please edit %CONFIG_DIR%\config.yaml and fill in your proxy nodes.
    ) else (echo [WARN] config\config.yaml not found, skipping.)
) else (
    echo [INFO] Config already exists: %CONFIG_DIR%\config.yaml  (skipping^)
)

:: ── Step 4: Install mihomo binary ────────────────────────
set "BIN_DIR=%INSTALL_DIR%"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"
if not exist "%BIN_DIR%\mihomo.exe" (
    echo [INFO] Downloading latest mihomo binary...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$r=Invoke-RestMethod 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest';" ^
      "$tag=$r.tag_name;" ^
      "$arch=if([Environment]::Is64BitOperatingSystem){'amd64'}else{'386'};" ^
      "$url='https://github.com/MetaCubeX/mihomo/releases/download/'+$tag+'/mihomo-windows-'+$arch+'-'+$tag+'.zip';" ^
      "Write-Host '[INFO] Downloading '+$url;" ^
      "$tmp=$env:TEMP+'\mihomo.zip';" ^
      "Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing;" ^
      "Expand-Archive -Path $tmp -DestinationPath $env:TEMP\mihomo_tmp -Force;" ^
      "$exe=Get-ChildItem $env:TEMP\mihomo_tmp -Filter *.exe | Select-Object -First 1;" ^
      "Move-Item $exe.FullName '%BIN_DIR%\mihomo.exe' -Force;" ^
      "Remove-Item $tmp,$env:TEMP\mihomo_tmp -Recurse -Force;"
    if exist "%BIN_DIR%\mihomo.exe" (
        echo [OK]   mihomo.exe installed to %BIN_DIR%
    ) else (
        echo [ERROR] Download failed. Please download manually from:
        echo         https://github.com/MetaCubeX/mihomo/releases
        echo         and place mihomo.exe in %BIN_DIR%
    )
) else (
    echo [INFO] mihomo.exe already exists in %BIN_DIR%
)

:: ── Step 5: Install mihomo-ctl ────────────────────────────
copy /Y "%REPO_ROOT%src\mihomo-ctl" "%BIN_DIR%\mihomo-ctl" >nul
echo [OK]   mihomo-ctl installed to %BIN_DIR%

:: ── Step 6: Create mihomo-ctl.bat wrapper ────────────────
(
echo @echo off
echo :: mihomo-ctl wrapper — auto-elevates for privileged commands
echo setlocal EnableDelayedExpansion
echo set "SCRIPT=%%~dp0mihomo-ctl"
echo set "_NEED_ADMIN=0"
echo if /i "%%~1"=="dns-on"    set "_NEED_ADMIN=1"
echo if /i "%%~1"=="dns-off"   set "_NEED_ADMIN=1"
echo if /i "%%~1"=="proxy-on"  set "_NEED_ADMIN=1"
echo if /i "%%~1"=="proxy-off" set "_NEED_ADMIN=1"
echo if /i "%%~1"=="upgrade"   set "_NEED_ADMIN=1"
echo if "%%_NEED_ADMIN%%"=="0" goto :run
echo net session ^>nul 2^>^&1
echo if %%errorlevel%% equ 0 goto :run
echo echo [INFO] 正在请求管理员权限...
echo powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath node -ArgumentList ('\"%%SCRIPT%%\" %%*') -Wait"
echo exit /b 0
echo :run
echo node "%%SCRIPT%%" %%*
) > "%BIN_DIR%\mihomo-ctl.bat"
echo [OK]   mihomo-ctl.bat wrapper created in %BIN_DIR%

:: ── Step 7: Suggest adding to PATH ───────────────────────
echo.
echo ==================================================
echo [OK]   Installation complete!
echo.
echo   Quick start:
echo     node "%BIN_DIR%\mihomo-ctl" status
echo     mihomo-ctl status       ^(after adding to PATH^)
echo.
echo   To add to PATH permanently:
echo     setx PATH "%%PATH%%;%BIN_DIR%"
echo     ^(restart terminal after running^)
echo.
echo   Then run:
echo     mihomo-ctl start
echo     mihomo-ctl status
echo     mihomo-ctl help
echo ==================================================
echo.
pause
