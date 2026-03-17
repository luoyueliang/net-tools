#!/usr/bin/env node
// smartxray 安装脚本
// 用法: node scripts/install.js [--no-download]

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

const HOME     = process.env.HOME || os.homedir();
const DATA_DIR = `${HOME}/.config/smartxray`;
const LOGS_DIR = `${DATA_DIR}/logs`;
const BIN_DST  = '/usr/local/bin/xray-ctl';
const XRAY_BIN = '/usr/local/bin/xray';
const UI_DST   = `${DATA_DIR}/ui`;
const SCRIPT_DIR = path.resolve(__dirname, '..');

// ANSI
const ok  = s => console.log(`\x1b[32m[OK]\x1b[0m   ${s}`);
const info = s => console.log(`\x1b[36m[INFO]\x1b[0m ${s}`);
const warn = s => console.log(`\x1b[33m[WARN]\x1b[0m ${s}`);
const err  = s => console.log(`\x1b[31m[ERR]\x1b[0m  ${s}`);

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); ok(`Created ${dir}`); }
  else info(`Directory exists: ${dir}`);
}

// ─── 检测平台 ────────────────────────────────────────────────
function detectPlatform() {
  if (process.platform === 'darwin') return 'macos';
  if (fs.existsSync('/etc/alpine-release'))  return 'alpine';
  if (fs.existsSync('/etc/openwrt_release')) return 'openwrt';
  if (process.platform === 'linux')   return 'linux';
  if (process.platform === 'freebsd') return 'freebsd';
  return 'unknown';
}

function detectArch() {
  const a = os.arch();
  if (a === 'x64')   return 'amd64';
  if (a === 'arm64') return 'arm64';
  if (a === 'arm')   return 'arm';
  return a;
}

// ─── npm install ─────────────────────────────────────────────
function installDeps() {
  const pkg = path.join(SCRIPT_DIR, 'package.json');
  const nm  = path.join(SCRIPT_DIR, 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(pkg)) { warn('package.json not found, skip npm install'); return; }
  if (fs.existsSync(nm)) { info('better-sqlite3 already installed'); return; }
  info('Installing npm dependencies (better-sqlite3)...');
  try {
    execSync('npm install --omit=dev', { cwd: SCRIPT_DIR, stdio: 'inherit' });
    ok('npm install done');
  } catch { err('npm install failed — install manually: cd smartxray && npm install'); }
}

// ─── 下载 xray ───────────────────────────────────────────────
function downloadXray() {
  if (fs.existsSync(XRAY_BIN)) {
    const ver = run(`${XRAY_BIN} version 2>/dev/null | head -1`);
    info(`xray already installed: ${ver}`);
    return;
  }
  const pl   = detectPlatform();
  const arch = detectArch();

  // xray-core GitHub releases naming: Xray-{os}-{arch}.zip
  const osMap  = { macos: 'macos', linux: 'linux', freebsd: 'freebsd', alpine: 'linux', openwrt: 'linux' };
  const osStr  = osMap[pl] || 'linux';
  const zipName = `Xray-${osStr}-${arch}.zip`;
  const url = `https://github.com/XTLS/Xray-core/releases/latest/download/${zipName}`;

  info(`Downloading xray: ${url}`);
  const tmpDir  = `${DATA_DIR}/tmp`;
  const tmpZip  = `${tmpDir}/xray.zip`;
  ensureDir(tmpDir);

  try {
    execSync(`curl -fsSL --max-time 60 -o "${tmpZip}" "${url}"`, { stdio: 'inherit' });
    execSync(`unzip -o "${tmpZip}" xray -d "${tmpDir}"`, { stdio: 'pipe' });
    execSync(`sudo install -m 755 "${tmpDir}/xray" "${XRAY_BIN}"`, { stdio: 'inherit' });
    // 移除 macOS 检疫属性
    if (pl === 'macos') run(`xattr -d com.apple.quarantine "${XRAY_BIN}" 2>/dev/null`);
    run(`rm -rf "${tmpDir}"`);
    ok(`xray installed → ${XRAY_BIN}`);
  } catch (e) {
    err(`xray download failed: ${e.message}`);
    warn(`请手动下载 ${url} 并解压 xray 到 ${XRAY_BIN}`);
  }
}

// ─── 安装 xray-ctl ───────────────────────────────────────────
function installCli() {
  const src = path.join(SCRIPT_DIR, 'src', 'xray-ctl');
  try {
    execSync(`sudo cp "${src}" "${BIN_DST}" && sudo chmod 755 "${BIN_DST}"`, { stdio: 'pipe' });
    ok(`xray-ctl installed → ${BIN_DST}`);
  } catch {
    // 无 sudo 时复制到用户 bin
    const local = `${HOME}/.local/bin/xray-ctl`;
    ensureDir(path.dirname(local));
    fs.copyFileSync(src, local);
    fs.chmodSync(local, 0o755);
    ok(`xray-ctl installed → ${local} (no sudo)`);
  }
}

// ─── 安装 Web UI ─────────────────────────────────────────────
function installUi() {
  const src = path.join(SCRIPT_DIR, 'ui', 'index.html');
  if (!fs.existsSync(src)) { warn('ui/index.html not found, skip'); return; }
  ensureDir(UI_DST);
  fs.copyFileSync(src, `${UI_DST}/index.html`);
  ok(`Web UI installed → ${UI_DST}/index.html`);
}

// ─── 平台服务脚本 ────────────────────────────────────────────
function installService(pl) {
  const svcDir = path.join(SCRIPT_DIR, 'scripts', 'platform', pl);
  if (!fs.existsSync(svcDir)) return;

  if (pl === 'linux') {
    const svc = path.join(svcDir, 'smartxray.service');
    if (!fs.existsSync(svc)) return;
    try {
      execSync(`sudo cp "${svc}" /etc/systemd/system/smartxray.service`, { stdio: 'pipe' });
      execSync('sudo systemctl daemon-reload', { stdio: 'pipe' });
      ok('systemd service installed (disabled). To enable: sudo systemctl enable --now smartxray');
    } catch { warn('systemd install failed — skip'); }
  } else if (pl === 'macos') {
    const plist = path.join(svcDir, 'com.smartxray.plist');
    if (!fs.existsSync(plist)) return;
    const dst = `${HOME}/Library/LaunchAgents/com.smartxray.plist.disabled`;
    fs.copyFileSync(plist, dst);
    ok(`LaunchAgent installed (disabled) → ${dst}`);
    info('To enable autostart: launchctl load ~/Library/LaunchAgents/com.smartxray.plist');
  } else if (pl === 'alpine') {
    const rc = path.join(svcDir, 'smartxray.openrc');
    if (!fs.existsSync(rc)) return;
    try {
      execSync(`sudo cp "${rc}" /etc/init.d/smartxray && sudo chmod +x /etc/init.d/smartxray`, { stdio: 'pipe' });
      ok('OpenRC service installed. To enable: rc-update add smartxray default');
    } catch { warn('OpenRC install failed — skip'); }
  }
}

// ─── 主流程 ──────────────────────────────────────────────────
(function main() {
  const noDownload = process.argv.includes('--no-download');
  const pl = detectPlatform();

  console.log('\n\x1b[1m== SmartXray 安装 ==\x1b[0m\n');
  info(`Platform: ${pl} / ${detectArch()}`);

  ensureDir(DATA_DIR);
  ensureDir(LOGS_DIR);
  ensureDir(`${DATA_DIR}/ui`);

  installDeps();
  if (!noDownload) downloadXray();
  installCli();
  installUi();
  installService(pl);

  console.log(`
\x1b[1m${'='.repeat(50)}\x1b[0m
\x1b[32m[OK]   Installation complete!\x1b[0m

  Quick start:
    xray-ctl user add alice          创建用户（自动分配端口）
    xray-ctl user add bob http       创建 HTTP 代理用户
    xray-ctl start                   启动 Xray
    xray-ctl ui                      打开 Web UI (http://127.0.0.1:9091/)
    xray-ctl status                  查看状态
    xray-ctl export                  导出 mihomo proxies 配置片段
\x1b[1m${'='.repeat(50)}\x1b[0m
`);
})();
