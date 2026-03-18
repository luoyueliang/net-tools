#!/usr/bin/env node
// smartxray installer — supports macOS / Linux (systemd) / Alpine (OpenRC) / FreeBSD
// Usage: node scripts/install.js [--no-download]
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

// ── ANSI colors ──────────────────────────────────────────────────
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};
const info    = (...a) => console.log(c.cyan('[INFO] ') + a.join(' '));
const success = (...a) => console.log(c.green('[OK]   ') + a.join(' '));
const warn    = (...a) => console.log(c.yellow('[WARN] ') + a.join(' '));
const error   = (...a) => { console.error(c.red('[ERROR]') + ' ' + a.join(' ')); process.exit(1); };

function run(cmd, opts = {}) {
  return (execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }) ?? '').trim();
}

// ── Proxy setup ──────────────────────────────────────────────────
async function promptProxy() {
  const existing = process.env.HTTPS_PROXY || process.env.https_proxy ||
                   process.env.HTTP_PROXY  || process.env.http_proxy  ||
                   process.env.ALL_PROXY   || process.env.all_proxy;
  if (existing) { info(`检测到代理环境变量: ${existing}`); return; }

  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const proxy = await new Promise(resolve => {
    process.stdout.write(c.cyan('[INFO] ') + '未检测到代理，如访问 GitHub 有问题可设置下载代理\n');
    rl.question('       (输入 http://host:port 或直接回车跳过): ', ans => { rl.close(); resolve(ans.trim()); });
  });
  if (!proxy) { info('跳过代理设置，直接连接'); return; }

  process.env.http_proxy  = proxy;
  process.env.https_proxy = proxy;
  process.env.HTTP_PROXY  = proxy;
  process.env.HTTPS_PROXY = proxy;
  info(`代理已设置: ${proxy}，测试连通性...`);
  try {
    run(`curl -sf --max-time 8 --proxy "${proxy}" "https://www.google.com" -o /dev/null`);
    success('代理连通性测试通过 ✓');
  } catch {
    warn('代理连通性测试未通过，将继续安装（下载失败时请检查代理地址是否正确）');
  }
}

// ── Detect platform ──────────────────────────────────────────────
function detectPlatform() {
  if (fs.existsSync('/etc/alpine-release')) return 'alpine';
  switch (process.platform) {
    case 'darwin':  return 'macos';
    case 'linux':   return 'linux';
    case 'freebsd': return 'freebsd';
    default: error(`Unsupported platform: ${process.platform}`);
  }
}

function detectArch() {
  const a = os.arch();
  if (a === 'x64')   return 'amd64';
  if (a === 'arm64') return 'arm64';
  if (a === 'arm')   return 'arm32-v7a';
  return a;
}

// ── Paths ────────────────────────────────────────────────────────
const PLATFORM   = detectPlatform();
const ARCH       = detectArch();
const HOME       = os.homedir();
const REPO_ROOT  = path.join(__dirname, '..');
const SCRIPT_DIR = __dirname;
const user       = run('whoami');

const configDir  = `${HOME}/.config/smartxray`;
const logsDir    = path.join(configDir, 'logs');
const binDir     = '/usr/local/bin';
const XRAY_BIN   = path.join(binDir, 'xray');
const CTL_BIN    = path.join(binDir, 'xray-ctl');

// ── Step 1: Check Node.js version ────────────────────────────────
function checkNode() {
  const ver = process.versions.node.split('.').map(Number);
  if (ver[0] < 16) error(`Node.js v16+ required, found v${process.versions.node}`);
  success(`Node.js v${process.versions.node}`);
}

// ── Step 2: Install npm dependencies ─────────────────────────────
function installDeps() {
  const nm = path.join(REPO_ROOT, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(nm)) { success('better-sqlite3 already installed'); return; }
  info('Installing npm dependencies (better-sqlite3)...');
  try {
    execSync('npm install --omit=dev', { cwd: REPO_ROOT, stdio: 'inherit' });
    success('npm install done');
  } catch { error('npm install failed — install manually: cd smartxray && npm install'); }
}

// ── Step 3: Download & install xray binary ───────────────────────
async function installXray() {
  if (fs.existsSync(XRAY_BIN)) {
    const ver = run(`${XRAY_BIN} version 2>/dev/null | head -1`);
    success(`xray already installed: ${ver || '(unknown version)'}  (run: xray-ctl upgrade if needed)`);
    return;
  }

  info('Fetching latest xray-core release...');
  let latest;
  try {
    const out = run('curl -sf --max-time 10 "https://api.github.com/repos/XTLS/Xray-core/releases/latest"');
    latest = JSON.parse(out).tag_name;
  } catch { error('Failed to fetch latest version. Check your network.'); }

  const osMap   = { macos: 'macos', linux: 'linux', alpine: 'linux', freebsd: 'freebsd' };
  const archMap = { amd64: 'amd64', arm64: 'arm64', 'arm32-v7a': 'arm32-v7a' };
  const osStr   = osMap[PLATFORM];
  const archStr = archMap[ARCH] || ARCH;
  const zipName = `Xray-${osStr}-${archStr}.zip`;
  const url     = `https://github.com/XTLS/Xray-core/releases/download/${latest}/${zipName}`;

  const tmpDir = path.join(configDir, 'tmp');
  const tmpZip = path.join(tmpDir, 'xray.zip');
  fs.mkdirSync(tmpDir, { recursive: true });

  info(`Downloading ${url}`);
  run(`curl -4 -fL --max-time 120 -o "${tmpZip}" "${url}"`, { stdio: 'inherit' });
  run(`unzip -o "${tmpZip}" xray -d "${tmpDir}"`, { stdio: 'pipe' });

  const tmpBin = path.join(tmpDir, 'xray');
  if (!fs.existsSync(tmpBin)) error('Decompress failed: xray binary not found in archive');

  run(`sudo install -m 755 "${tmpBin}" "${XRAY_BIN}"`);
  if (PLATFORM === 'macos') run(`xattr -d com.apple.quarantine "${XRAY_BIN}" 2>/dev/null || true`);
  run(`rm -rf "${tmpDir}"`);
  success(`xray ${latest} installed to ${XRAY_BIN}`);
}

// ── Step 4: Create config directories ────────────────────────────
function createDirs() {
  for (const dir of [configDir, logsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      success(`Created ${dir}`);
    } else {
      info(`Directory exists: ${dir}`);
    }
  }
}

// ── Step 5: Install platform startup script ──────────────────────
function installStartup() {
  if (PLATFORM === 'macos') {
    const launchDir = `${HOME}/Library/LaunchAgents`;
    const dstBase   = path.join(launchDir, 'com.smartxray.plist');
    const dstDis    = `${dstBase}.disabled`;
    const src       = path.join(SCRIPT_DIR, 'platform/macos/com.smartxray.plist');

    fs.mkdirSync(launchDir, { recursive: true });
    const content = fs.readFileSync(src, 'utf8').replace(/__HOME__/g, HOME);
    fs.writeFileSync(dstDis, content);
    success(`LaunchAgent installed (autostart disabled): ${dstDis}`);
    info('Enable autostart: xray-ctl autostart on');

  } else if (PLATFORM === 'linux') {
    const src = path.join(SCRIPT_DIR, 'platform/linux/smartxray.service');
    const dst = '/etc/systemd/system/smartxray.service';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run('sudo systemctl daemon-reload');
    success(`systemd service installed: ${dst}`);
    info('Enable autostart: xray-ctl autostart on');
    info('Start:            xray-ctl start');

  } else if (PLATFORM === 'alpine') {
    const src = path.join(SCRIPT_DIR, 'platform/alpine/smartxray.openrc');
    const dst = '/etc/init.d/smartxray';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod +x "${dst}"`);
    success(`OpenRC init script installed: ${dst}`);
    info('Enable autostart: xray-ctl autostart on');
    info('Start:            xray-ctl start');

  } else if (PLATFORM === 'freebsd') {
    const src = path.join(SCRIPT_DIR, 'platform/freebsd/smartxray');
    const dst = '/usr/local/etc/rc.d/smartxray';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod 555 "${dst}"`);
    success(`rc.d script installed: ${dst}`);
    info(`Enable: sysrc smartxray_enable=YES`);
  }
}

// ── Step 6: Install xray-ctl ─────────────────────────────────────
async function installCtl() {
  const dst = path.join(binDir, 'xray-ctl');

  // 1. 查询 GitHub Release 最新版本
  let ctlVer;
  try {
    const out = run(
      'curl -sf --max-time 10 ' +
      '"https://api.github.com/repos/luoyueliang/net-tools/releases?per_page=20"'
    );
    if (out) {
      const rels = JSON.parse(out);
      const rel  = rels.find(r => r.tag_name && r.tag_name.startsWith('smartxray-v'));
      if (rel) ctlVer = rel.tag_name.replace('smartxray-v', '');
    }
  } catch {}

  // 2. 尝试从 GitHub Release 下载
  if (ctlVer) {
    const assetName = `xray-ctl-${ctlVer}.gz`;
    const url       = `https://github.com/luoyueliang/net-tools/releases/download/smartxray-v${ctlVer}/${assetName}`;
    const tmpGz     = path.join(os.tmpdir(), assetName);
    const tmpBin    = path.join(os.tmpdir(), 'xray-ctl-download');

    info(`Downloading xray-ctl v${ctlVer} from GitHub Release...`);
    try {
      run(`curl -fsSL --max-time 60 -o "${tmpGz}" "${url}"`);
      run(`gunzip -c "${tmpGz}" > "${tmpBin}" && chmod +x "${tmpBin}"`);
      run(`sudo mv "${tmpBin}" "${dst}"`);
      try { fs.unlinkSync(tmpGz); } catch {}
      success(`xray-ctl v${ctlVer} installed to ${dst}`);
      return;
    } catch (e) {
      warn(`GitHub Release download failed: ${e.message}`);
      warn('Falling back to local source copy...');
    }
  } else {
    warn('No smartxray release found on GitHub, using local source copy');
  }

  // 3. 回退：从本地 src/xray-ctl 复制
  try {
    execSync(`sudo cp "${path.join(REPO_ROOT, 'src', 'xray-ctl')}" "${dst}" && sudo chmod 755 "${dst}"`, { stdio: 'pipe' });
    success(`xray-ctl installed to ${dst}`);
  } catch {
    const local = path.join(HOME, '.local/bin/xray-ctl');
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, 'src', 'xray-ctl'), local);
    fs.chmodSync(local, 0o755);
    success(`xray-ctl installed to ${local} (no sudo)`);
  }
}

// ── Step 7: Install Web UI ────────────────────────────────────────
function installUi() {
  const srcDir = path.join(REPO_ROOT, 'ui');
  if (!fs.existsSync(srcDir)) { warn('ui/ not found, skipping Web UI install'); return; }
  const uiDst = path.join(configDir, 'ui');
  fs.mkdirSync(uiDst, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, f), path.join(uiDst, f));
  }
  success(`Web UI installed to ${uiDst}`);
  info(`Access: http://127.0.0.1:9091/  (after xray-ctl start)`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const noDownload = process.argv.includes('--no-download');

  console.log('\n' + c.bold('='.repeat(50)));
  console.log(c.bold('  smartxray installer'));
  console.log(c.bold(`  Platform: ${PLATFORM} / ${ARCH}`));
  console.log(c.bold('='.repeat(50)) + '\n');

  checkNode();
  await promptProxy();
  installDeps();
  if (!noDownload) await installXray();
  createDirs();
  installStartup();
  await installCtl();
  installUi();

  console.log('\n' + c.bold('='.repeat(50)));
  success('Installation complete!');
  console.log(c.dim('\n  Quick start:'));
  console.log(c.dim('    xray-ctl start                   启动 Xray'));
  console.log(c.dim('    xray-ctl user add alice           创建用户（自动分配端口）'));
  console.log(c.dim('    xray-ctl reality init             初始化 VLESS+Reality'));
  console.log(c.dim('    xray-ctl status                  查看状态'));
  console.log(c.dim('    xray-ctl export                  导出 mihomo proxies 配置'));
  console.log(c.bold('='.repeat(50)));
}

main().catch(e => { error(e.message); });
