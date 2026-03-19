#Requires -Version 5.1
<#
.SYNOPSIS
    mihomo Windows 安装脚本 (PowerShell)
.DESCRIPTION
    与 install.js 平台惯例一致，提供 Windows 原生安装体验。
    检测平台、下载 mihomo 二进制、设置目录、安装 mihomo-ctl 包装器。
.EXAMPLE
    # 在仓库 mihomo\ 目录下，以管理员身份运行：
    powershell -ExecutionPolicy Bypass -File scripts\platform\windows\install.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot  = Resolve-Path (Join-Path $PSScriptRoot '..\..\..') | Select-Object -ExpandProperty Path
$InstDir   = 'C:\Program Files\mihomo'
$ConfigDir = Join-Path $env:APPDATA 'mihomo'
$DataDir   = Join-Path $ConfigDir  'data'
$LogsDir   = Join-Path $ConfigDir  'logs'

function OK($msg)   { Write-Host "[OK]   $msg"   -ForegroundColor Green  }
function INFO($msg) { Write-Host "[INFO] $msg"   -ForegroundColor Cyan   }
function WARN($msg) { Write-Host "[WARN] $msg"   -ForegroundColor Yellow }
function ERR($msg)  { Write-Host "[ERROR] $msg"  -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  mihomo installer  [Windows / PowerShell]"        -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Check Node.js ─────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    ERR "未找到 Node.js，请先安装 v16+：https://nodejs.org"
}
OK "Node.js $(node -e 'process.stdout.write(process.version)')"

# ── Proxy setup ──────────────────────────────────────────────────
$_ep = $env:HTTPS_PROXY
if (-not $_ep) { $_ep = $env:HTTP_PROXY }
if (-not $_ep) { $_ep = $env:https_proxy }
if (-not $_ep) { $_ep = $env:http_proxy }
if ($_ep) {
    INFO "检测到代理环境变量: $_ep"
    [System.Net.WebRequest]::DefaultWebProxy = New-Object System.Net.WebProxy($_ep)
    [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
} else {
    Write-Host ""
    Write-Host "[INFO] 未检测到代理，如访问 GitHub 有问题可设置下载代理" -ForegroundColor Cyan
    $proxyInput = (Read-Host "       输入 http://host:port (或留空跳过)").Trim()
    if ($proxyInput -ne '') {
        $env:HTTP_PROXY  = $proxyInput
        $env:HTTPS_PROXY = $proxyInput
        [System.Net.WebRequest]::DefaultWebProxy = New-Object System.Net.WebProxy($proxyInput)
        [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
        INFO "代理已设置: $proxyInput，测试连通性..."
        try {
            Invoke-WebRequest -Uri 'https://www.google.com' -UseBasicParsing -TimeoutSec 8 `
                -Proxy $proxyInput -ErrorAction Stop | Out-Null
            OK "代理连通性测试通过 ✓"
        } catch {
            WARN "代理连通性测试未通过，将继续安装（下载失败时请检查代理地址）"
        }
    } else { INFO "跳过代理设置，直接连接" }
}

# ── Step 2: Create config directories ────────────────────
foreach ($dir in @($DataDir, $LogsDir)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null; OK "Created $dir" }
    else                       { INFO "Directory exists: $dir" }
}

# ── Step 3: Copy config template ─────────────────────────
$dst = Join-Path $ConfigDir 'config.yaml'
$src = Join-Path $RepoRoot  'config\config.yaml'
if (-not (Test-Path $dst)) {
    if (Test-Path $src) {
        Copy-Item $src $dst
        OK "Config template copied to $dst"
        WARN "Please edit $dst and fill in your proxy nodes."
    } else { WARN "config\config.yaml not found, skipping." }
} else { INFO "Config already exists: $dst  (skipping)" }

# ── Step 4: Install mihomo binary ────────────────────────
New-Item -ItemType Directory -Force $InstDir | Out-Null
$binPath = Join-Path $InstDir 'mihomo.exe'
if (-not (Test-Path $binPath)) {
    INFO "Fetching latest mihomo release..."
    try {
        $rel    = Invoke-RestMethod 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest'
        $tag    = $rel.tag_name
        $arch   = if ([Environment]::Is64BitOperatingSystem) { 'amd64' } else { '386' }
        $url    = "https://github.com/MetaCubeX/mihomo/releases/download/$tag/mihomo-windows-$arch-$tag.zip"
        $tmpZip = Join-Path $env:TEMP 'mihomo.zip'
        $tmpDir = Join-Path $env:TEMP 'mihomo_tmp'
        INFO "Downloading $url"
        Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing
        Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
        $exe = Get-ChildItem $tmpDir -Filter '*.exe' | Select-Object -First 1
        if (-not $exe) { throw "No .exe found in archive" }
        Move-Item $exe.FullName $binPath -Force
        Remove-Item $tmpZip, $tmpDir -Recurse -Force
        OK "mihomo $tag installed to $binPath"
    } catch {
        WARN "Auto-download failed: $_"
        WARN "Please download manually from https://github.com/MetaCubeX/mihomo/releases"
        WARN "and place mihomo.exe in $InstDir"
    }
} else { INFO "mihomo.exe already exists in $InstDir" }

# ── Step 5: Install mihomo-ctl ────────────────────────────
$ctlSrc = Join-Path $RepoRoot 'src\mihomo-ctl'
$ctlDst = Join-Path $InstDir  'mihomo-ctl'
Copy-Item $ctlSrc $ctlDst -Force
OK "mihomo-ctl installed to $ctlDst"

# ── Step 6: Create mihomo-ctl.bat wrapper ────────────────
$bat = Join-Path $InstDir 'mihomo-ctl.bat'
$batContent = @'
@echo off
setlocal EnableDelayedExpansion
set "SCRIPT=%~dp0mihomo-ctl"
set "_NEED_ADMIN=0"
if /i "%~1"=="dns-on"    set "_NEED_ADMIN=1"
if /i "%~1"=="dns-off"   set "_NEED_ADMIN=1"
if /i "%~1"=="proxy-on"  set "_NEED_ADMIN=1"
if /i "%~1"=="proxy-off" set "_NEED_ADMIN=1"
if /i "%~1"=="tun-on"    set "_NEED_ADMIN=1"
if /i "%~1"=="tun-off"   set "_NEED_ADMIN=1"
if /i "%~1"=="upgrade"   set "_NEED_ADMIN=1"
if "%_NEED_ADMIN%"=="0" goto :run
net session >nul 2>&1
if %errorlevel% equ 0 goto :run
echo [INFO] 正在请求管理员权限...
powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath node -ArgumentList ('\"%SCRIPT%\" %*') -Wait"
exit /b 0
:run
node "%SCRIPT%" %*
'@
Set-Content -Path $bat -Value $batContent -Encoding ASCII
OK "mihomo-ctl.bat wrapper created in $InstDir"

# ── Step 7: Create PowerShell wrapper ────────────────────
$ps1 = Join-Path $InstDir 'mihomo-ctl.ps1'
$ps1Content = @'
$Script     = Join-Path $PSScriptRoot 'mihomo-ctl'
$Cmd        = if ($args.Count -gt 0) { $args[0] } else { '' }
$AdminCmds  = @('dns-on','dns-off','proxy-on','proxy-off','tun-on','tun-off','upgrade')
if ($AdminCmds -contains $Cmd) {
    $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $IsAdmin) {
        Write-Host "[INFO] 正在请求管理员权限..." -ForegroundColor Cyan
        $ArgList = @("`"$Script`"") + ($args | ForEach-Object { "`"$_`"" })
        Start-Process -Verb RunAs -FilePath node -ArgumentList $ArgList -Wait
        exit 0
    }
}
& node $Script @args
'@
Set-Content -Path $ps1 -Value $ps1Content -Encoding UTF8
OK "mihomo-ctl.ps1 wrapper created in $InstDir"

# ── Summary ───────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
OK "Installation complete!"
Write-Host ""
Write-Host "  Quick start:" -ForegroundColor White
Write-Host "    mihomo-ctl start     (after adding to PATH)" -ForegroundColor DarkGray
Write-Host "    mihomo-ctl status"                            -ForegroundColor DarkGray
Write-Host "    mihomo-ctl help"                              -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Add to PATH (run once, then restart terminal):" -ForegroundColor White
Write-Host "    [Environment]::SetEnvironmentVariable('PATH',`$env:PATH+';$InstDir','Machine')" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
