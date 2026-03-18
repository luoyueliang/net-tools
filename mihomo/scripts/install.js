#!/usr/bin/env node
// mihomo installer — supports macOS / Linux / FreeBSD / OpenWrt
// Usage: node install.js
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
  if (fs.existsSync('/etc/openwrt_release'))  return 'openwrt';
  if (fs.existsSync('/etc/alpine-release'))   return 'alpine';
  switch (process.platform) {
    case 'darwin':  return 'macos';
    case 'linux':   return 'linux';
    case 'freebsd': return 'freebsd';
    default: error(`Unsupported platform: ${process.platform}`);
  }
}

function detectArch() {
  return process.arch === 'arm64' ? 'arm64' : 'amd64';
}

// ── Paths ────────────────────────────────────────────────────────
const PLATFORM   = detectPlatform();
const ARCH       = detectArch();
const HOME       = os.homedir();
const REPO_ROOT  = path.join(__dirname, '..');
const SCRIPT_DIR = __dirname;

const PLATFORM_PATHS = {
  macos: {
    binDir:    '/usr/local/bin',
    configDir: `${HOME}/.config/mihomo`,
    user:      run('whoami'),
  },
  linux: {
    binDir:    '/usr/local/bin',
    configDir: `${HOME}/.config/mihomo`,
    user:      run('whoami'),
  },
  alpine: {
    binDir:    '/usr/local/bin',
    configDir: `${HOME}/.config/mihomo`,
    user:      run('whoami'),
  },
  freebsd: {
    binDir:    '/usr/local/bin',
    configDir: `${HOME}/.config/mihomo`,
    user:      run('whoami'),
  },
  openwrt: {
    binDir:    '/usr/local/bin',
    configDir: '/etc/mihomo',
    user:      'root',
  },
};

const { binDir, configDir, user } = PLATFORM_PATHS[PLATFORM];
const dataDir = path.join(configDir, 'data');
const logsDir = path.join(configDir, 'logs');

// ── Step 1: Check Node.js version ────────────────────────────────
function checkNode() {
  const ver = process.versions.node.split('.').map(Number);
  if (ver[0] < 16) error(`Node.js v16+ required, found v${process.versions.node}`);
  success(`Node.js v${process.versions.node}`);
}

// ── Step 2: Download & install mihomo binary ─────────────────────
async function installBin() {
  const binPath = path.join(binDir, 'mihomo');
  if (fs.existsSync(binPath)) {
    try {
      const cur = run(`${binPath} -v 2>/dev/null`).split(/\s+/)[2] || 'unknown';
      success(`mihomo already installed: ${cur}  (run: mihomo-ctl upgrade)`);
    } catch { success('mihomo already installed'); }
    return;
  }

  info('Fetching latest mihomo release...');
  let latest;
  try {
    const out = run('curl -sf --max-time 10 "https://api.github.com/repos/MetaCubeX/mihomo/releases/latest"');
    latest = JSON.parse(out).tag_name;
  } catch { error('Failed to fetch latest version. Check your network.'); }

  const osMap = { macos: 'darwin', linux: 'linux', alpine: 'linux', freebsd: 'freebsd', openwrt: 'linux' };
  const osName = osMap[PLATFORM];
  const url = `https://github.com/MetaCubeX/mihomo/releases/download/${latest}/mihomo-${osName}-${ARCH}-${latest}.gz`;
  const tmp = `/tmp/mihomo-${latest}.gz`;

  info(`Downloading ${url}`);
  run(`curl -4 -L --max-time 120 -o "${tmp}" "${url}"`, { stdio: 'inherit' });

  run(`gunzip -f "${tmp}"`);
  const unzipped = tmp.replace('.gz', '');
  if (!fs.existsSync(unzipped)) error('Decompress failed');

  run(`chmod +x "${unzipped}"`);
  run(`sudo mv "${unzipped}" "${binPath}"`);
  run(`xattr -d com.apple.quarantine "${binPath}" 2>/dev/null || true`);
  success(`mihomo ${latest} installed to ${binPath}`);
}

// ── Step 3: Create config directories ────────────────────────────
function createDirs() {
  for (const dir of [configDir, dataDir, logsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      success(`Created ${dir}`);
    } else {
      info(`Directory exists: ${dir}`);
    }
  }
}

// ── Step 4: Install config template ──────────────────────────────
function installConfig() {
  const dst = path.join(configDir, 'config.yaml');
  const src = path.join(REPO_ROOT, 'config', 'config.yaml');
  if (fs.existsSync(dst)) {
    info(`Config already exists: ${dst}  (skipping)`);
  } else {
    fs.copyFileSync(src, dst);
    success(`Config template copied to ${dst}`);
    warn(`Edit ${dst} and fill in your proxy nodes before starting.`);
  }
}

// ── Step 5: Install platform startup script ──────────────────────
function installStartup() {
  if (PLATFORM === 'macos') {
    const launchDir = `${HOME}/Library/LaunchAgents`;
    const plistId   = 'io.github.metacubex.mihomo';
    const dstBase   = path.join(launchDir, `${plistId}.plist`);
    const dstDis    = `${dstBase}.disabled`;
    const src       = path.join(SCRIPT_DIR, 'platform/macos/mihomo.plist');

    fs.mkdirSync(launchDir, { recursive: true });
    let content = fs.readFileSync(src, 'utf8').replace(/__HOME__/g, HOME);
    // Write as disabled by default
    fs.writeFileSync(dstDis, content);
    success(`LaunchAgent installed (autostart disabled): ${dstDis}`);
    info('Enable autostart: mihomo-ctl autostart on');

  } else if (PLATFORM === 'linux') {
    const src = path.join(SCRIPT_DIR, 'platform/linux/mihomo.service');
    const dst = '/etc/systemd/system/mihomo.service';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    let content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run('sudo systemctl daemon-reload');
    success(`systemd service installed: ${dst}`);
    info('Enable autostart: sudo systemctl enable mihomo');
    info('Start now: sudo systemctl start mihomo');

  } else if (PLATFORM === 'freebsd') {
    const src = path.join(SCRIPT_DIR, 'platform/freebsd/mihomo.rc');
    const dst = '/usr/local/etc/rc.d/mihomo';
    let content = fs.readFileSync(src, 'utf8').replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod 555 "${dst}"`);
    success(`rc.d script installed: ${dst}`);
    info(`Enable: sysrc mihomo_enable=YES mihomo_user=${user}`);

  } else if (PLATFORM === 'alpine') {
    const src = path.join(SCRIPT_DIR, 'platform/alpine/mihomo.openrc');
    const dst = '/etc/init.d/mihomo';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    let content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod +x "${dst}"`);
    success(`OpenRC init script installed: ${dst}`);
    info(`Enable autostart: sudo rc-update add mihomo default`);
    info('Start now: sudo rc-service mihomo start');

  } else if (PLATFORM === 'openwrt') {
    const src = path.join(SCRIPT_DIR, 'platform/openwrt/mihomo.init');
    const dst = '/etc/init.d/mihomo';
    fs.copyFileSync(src, dst);
    run(`chmod +x "${dst}"`);
    success(`init.d script installed: ${dst}`);
    info('Enable autostart: /etc/init.d/mihomo enable');
    info('Start now: /etc/init.d/mihomo start');
  }
}

// ── Step 6: Install mihomo-ctl ────────────────────────────────────
async function installCtl() {
  const dst     = path.join(binDir, 'mihomo-ctl');
  // ctl 包命名使用 Node.js 原生 platform/arch（darwin/linux, arm64/x64）
  const osMap   = { darwin: 'darwin', linux: 'linux', freebsd: 'linux' };
  const archMap = { arm64: 'arm64', x64: 'x64' };
  const osName  = osMap[process.platform] || 'linux';
  const ctlArch = archMap[process.arch] || 'x64';

  // 1. 查询 GitHub Release 最新版本
  let ctlVer;
  try {
    const out = run(
      'curl -sf --max-time 10 ' +
      '"https://api.github.com/repos/luoyueliang/net-tools/releases?per_page=20"'
    );
    if (out) {
      const rels = JSON.parse(out);
      const rel  = rels.find(r => r.tag_name && r.tag_name.startsWith('mihomo-ctl-v'));
      if (rel) ctlVer = rel.tag_name.replace('mihomo-ctl-v', '');
    }
  } catch {}

  // 2. 尝试从 GitHub Release 下载
  if (ctlVer) {
    const assetName = `mihomo-ctl-${ctlVer}-${osName}-${ctlArch}.gz`;
    const url       = `https://github.com/luoyueliang/net-tools/releases/download/mihomo-ctl-v${ctlVer}/${assetName}`;
    const tmpGz     = path.join(os.tmpdir(), assetName);
    const tmpBin    = path.join(os.tmpdir(), 'mihomo-ctl-download');

    info(`Downloading mihomo-ctl v${ctlVer} (${osName}-${ctlArch}) from GitHub Release...`);
    try {
      run(`curl -fsSL --max-time 60 -o "${tmpGz}" "${url}"`);
      run(`gunzip -c "${tmpGz}" > "${tmpBin}" && chmod +x "${tmpBin}"`);
      run(`sudo mv "${tmpBin}" "${dst}"`);
      try { fs.unlinkSync(tmpGz); } catch {}
      success(`mihomo-ctl v${ctlVer} installed to ${dst}`);
      return;
    } catch (e) {
      warn(`GitHub Release download failed: ${e.message}`);
      warn('Falling back to local source copy...');
    }
  } else {
    warn('No mihomo-ctl release found on GitHub, using local source copy');
  }

  // 3. 回退：从本地 src/mihomo-ctl 复制
  const src = path.join(REPO_ROOT, 'src', 'mihomo-ctl');
  run(`sudo cp "${src}" "${dst}"`);
  run(`sudo chmod +x "${dst}"`);
  success(`mihomo-ctl installed from local source to ${dst}`);
}

// ── Step 7: Install Web UI ────────────────────────────────────────
function installUi() {
  const srcHtml = path.join(REPO_ROOT, 'ui', 'index.html');
  if (!fs.existsSync(srcHtml)) {
    warn('ui/index.html not found, skipping Web UI install');
    return;
  }
  const uiDir = path.join(configDir, 'ui');
  fs.mkdirSync(uiDir, { recursive: true });
  fs.copyFileSync(srcHtml, path.join(uiDir, 'index.html'));

  // Patch external-ui into config.yaml if not already set
  const configFile = path.join(configDir, 'config.yaml');
  if (fs.existsSync(configFile)) {
    let cfg = fs.readFileSync(configFile, 'utf8');
    if (!cfg.includes('external-ui:')) {
      if (cfg.includes('external-controller:')) {
        cfg = cfg.replace(
          /(external-controller:[^\n]*)/,
          `$1\nexternal-ui: ${uiDir}`
        );
      } else {
        cfg += `\nexternal-ui: ${uiDir}\n`;
      }
      fs.writeFileSync(configFile, cfg, 'utf8');
      info(`external-ui: ${uiDir} → written to config.yaml`);
    }
  }
  success(`Web UI installed to ${uiDir}`);
  info(`Access: http://127.0.0.1:9090/ui/  (after mihomo-ctl reload)`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + c.bold('='.repeat(50)));
  console.log(c.bold('  mihomo installer'));
  console.log(c.bold(`  Platform: ${PLATFORM} / ${ARCH}`));
  console.log(c.bold('='.repeat(50)) + '\n');

  checkNode();
  await promptProxy();
  await installBin();
  createDirs();
  installConfig();
  installStartup();
  await installCtl();
  installUi();

  console.log('\n' + c.bold('='.repeat(50)));
  success('Installation complete!');
  console.log(c.dim('\n  Quick start:'));
  console.log(c.dim('    mihomo-ctl start       Start proxy'));
  console.log(c.dim('    mihomo-ctl status      Show status'));
  console.log(c.dim('    mihomo-ctl ui open     Open Web UI'));
  console.log(c.dim('    mihomo-ctl help        All commands'));
  console.log(c.bold('='.repeat(50)) + '\n');
}

main().catch(e => error(e.message));
