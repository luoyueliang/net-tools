#!/usr/bin/env node
// __TOOL_NAME__ installer — supports macOS / Linux (systemd) / Alpine (OpenRC) / FreeBSD / OpenWrt
// Usage: node scripts/install.js
//
// ── 使用前请替换以下占位符 ────────────────────────────────────
// __TOOL_NAME__   工具名称（目录名 / 服务名）
// __CTL_NAME__    管理命令名
// __BIN_NAME__    核心二进制文件名
// __PLIST_ID__    macOS LaunchAgent Bundle ID
// ─────────────────────────────────────────────────────────────
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
const user       = run('whoami');

// TODO: 根据工具修改以下路径配置
const PLATFORM_PATHS = {
  macos:   { binDir: '/usr/local/bin', configDir: `${HOME}/.config/__TOOL_NAME__` },
  linux:   { binDir: '/usr/local/bin', configDir: `${HOME}/.config/__TOOL_NAME__` },
  alpine:  { binDir: '/usr/local/bin', configDir: `${HOME}/.config/__TOOL_NAME__` },
  freebsd: { binDir: '/usr/local/bin', configDir: `${HOME}/.config/__TOOL_NAME__` },
  openwrt: { binDir: '/usr/local/bin', configDir: '/etc/__TOOL_NAME__' },
};

const { binDir, configDir } = PLATFORM_PATHS[PLATFORM];
const dataDir = path.join(configDir, 'data');
const logsDir = path.join(configDir, 'logs');

// ── Step 1: Check Node.js version ────────────────────────────────
function checkNode() {
  const ver = process.versions.node.split('.').map(Number);
  if (ver[0] < 16) error(`Node.js v16+ required, found v${process.versions.node}`);
  success(`Node.js v${process.versions.node}`);
}

// ── Step 2: Download & install binary ────────────────────────────
// TODO: 实现工具的二进制下载逻辑，参考 mihomo/scripts/install.js
async function installBin() {
  const binPath = path.join(binDir, '__BIN_NAME__');
  if (fs.existsSync(binPath)) {
    success(`__BIN_NAME__ already installed (run: __CTL_NAME__ upgrade to update)`);
    return;
  }
  warn('TODO: 实现 __BIN_NAME__ 的下载逻辑');
  // 参考示例（以 GitHub Releases 下载 .gz 文件为例）：
  // info('Fetching latest release...');
  // const latest = JSON.parse(run('curl -sf --max-time 10 "https://api.github.com/repos/<owner>/<repo>/releases/latest"')).tag_name;
  // const url = `https://github.com/<owner>/<repo>/releases/download/${latest}/__BIN_NAME__-...${ARCH}.gz`;
  // const tmp = `/tmp/__BIN_NAME__-${latest}.gz`;
  // run(`curl -4 -L --max-time 120 -o "${tmp}" "${url}"`, { stdio: 'inherit' });
  // run(`gunzip -f "${tmp}"`);
  // run(`sudo mv "${tmp.replace('.gz', '')}" "${binPath}"`);
  // if (PLATFORM === 'macos') run(`xattr -d com.apple.quarantine "${binPath}" 2>/dev/null || true`);
  // success(`__BIN_NAME__ installed to ${binPath}`);
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
  const src = path.join(REPO_ROOT, 'config', 'config.example.yaml');
  if (fs.existsSync(dst)) {
    info(`Config already exists: ${dst}  (skipping)`);
  } else if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    success(`Config template copied to ${dst}`);
    warn(`Edit ${dst} before starting.`);
  }
}

// ── Step 5: Install platform startup script ──────────────────────
function installStartup() {
  if (PLATFORM === 'macos') {
    const launchDir = `${HOME}/Library/LaunchAgents`;
    const dstBase   = path.join(launchDir, '__PLIST_ID__.plist');
    const dstDis    = `${dstBase}.disabled`;
    const src       = path.join(SCRIPT_DIR, 'platform/macos/tool.plist');

    fs.mkdirSync(launchDir, { recursive: true });
    const content = fs.readFileSync(src, 'utf8').replace(/__HOME__/g, HOME);
    fs.writeFileSync(dstDis, content);
    success(`LaunchAgent installed (autostart disabled): ${dstDis}`);
    info('Enable autostart: __CTL_NAME__ autostart on');

  } else if (PLATFORM === 'linux') {
    const src = path.join(SCRIPT_DIR, 'platform/linux/tool.service');
    const dst = '/etc/systemd/system/__TOOL_NAME__.service';
    // /home/__USER__ must be replaced BEFORE __USER__ to handle root (HOME=/root)
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run('sudo systemctl daemon-reload');
    success(`systemd service installed: ${dst}`);
    info('Enable autostart: __CTL_NAME__ autostart on');

  } else if (PLATFORM === 'freebsd') {
    const src = path.join(SCRIPT_DIR, 'platform/freebsd/tool.rc');
    const dst = '/usr/local/etc/rc.d/__TOOL_NAME__';
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod 555 "${dst}"`);
    success(`rc.d script installed: ${dst}`);
    info(`Enable: sysrc __TOOL_NAME___enable=YES`);

  } else if (PLATFORM === 'alpine') {
    const src = path.join(SCRIPT_DIR, 'platform/alpine/tool.openrc');
    const dst = '/etc/init.d/__TOOL_NAME__';
    const content = fs.readFileSync(src, 'utf8')
      .replace(/\/home\/__USER__/g, HOME)
      .replace(/__USER__/g, user);
    run(`sudo tee "${dst}" > /dev/null`, { input: content, stdio: ['pipe', 'inherit', 'inherit'] });
    run(`sudo chmod +x "${dst}"`);
    success(`OpenRC init script installed: ${dst}`);
    info('Enable autostart: __CTL_NAME__ autostart on');

  } else if (PLATFORM === 'openwrt') {
    const src = path.join(SCRIPT_DIR, 'platform/openwrt/tool.init');
    const dst = '/etc/init.d/__TOOL_NAME__';
    fs.copyFileSync(src, dst);
    run(`chmod +x "${dst}"`);
    success(`init.d script installed: ${dst}`);
    info('Enable autostart: /etc/init.d/__TOOL_NAME__ enable');
  }
}

// ── Step 6: Install __CTL_NAME__ ─────────────────────────────────
async function installCtl() {
  const dst = path.join(binDir, '__CTL_NAME__');

  // 1. 查询 GitHub Release 最新版本
  // TODO: 替换 '__TOOL_NAME__-v' 为实际的 tag 前缀
  let ctlVer;
  try {
    const out = run(
      'curl -sf --max-time 10 ' +
      '"https://api.github.com/repos/__GITHUB_REPO__/releases?per_page=20"'
    );
    if (out) {
      const rels = JSON.parse(out);
      const rel  = rels.find(r => r.tag_name && r.tag_name.startsWith('__TOOL_NAME__-v'));
      if (rel) ctlVer = rel.tag_name.replace('__TOOL_NAME__-v', '');
    }
  } catch {}

  // 2. 尝试从 GitHub Release 下载
  if (ctlVer) {
    const assetName = `__CTL_NAME__-${ctlVer}.gz`;
    const url       = `https://github.com/__GITHUB_REPO__/releases/download/__TOOL_NAME__-v${ctlVer}/${assetName}`;
    const tmpGz     = path.join(os.tmpdir(), assetName);
    const tmpBin    = path.join(os.tmpdir(), '__CTL_NAME__-download');

    info(`Downloading __CTL_NAME__ v${ctlVer} from GitHub Release...`);
    try {
      run(`curl -fsSL --max-time 60 -o "${tmpGz}" "${url}"`);
      run(`gunzip -c "${tmpGz}" > "${tmpBin}" && chmod +x "${tmpBin}"`);
      run(`sudo mv "${tmpBin}" "${dst}"`);
      try { fs.unlinkSync(tmpGz); } catch {}
      success(`__CTL_NAME__ v${ctlVer} installed to ${dst}`);
      return;
    } catch (e) {
      warn(`GitHub Release download failed: ${e.message}`);
      warn('Falling back to local source copy...');
    }
  } else {
    warn('No __TOOL_NAME__ release found on GitHub, using local source copy');
  }

  // 3. 回退：从本地 src/tool-ctl 复制
  run(`sudo cp "${path.join(REPO_ROOT, 'src', 'tool-ctl')}" "${dst}"`);
  run(`sudo chmod +x "${dst}"`);
  success(`__CTL_NAME__ installed to ${dst}`);
}

// ── Step 7: Install Web UI (optional) ────────────────────────────
function installUi() {
  const srcHtml = path.join(REPO_ROOT, 'ui', 'index.html');
  if (!fs.existsSync(srcHtml)) {
    info('ui/index.html not found, skipping Web UI install');
    return;
  }
  const uiDir = path.join(configDir, 'ui');
  fs.mkdirSync(uiDir, { recursive: true });
  fs.copyFileSync(srcHtml, path.join(uiDir, 'index.html'));
  success(`Web UI installed to ${uiDir}`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + c.bold('='.repeat(50)));
  console.log(c.bold('  __TOOL_NAME__ installer'));
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
  console.log(c.dim('    __CTL_NAME__ start             启动服务'));
  console.log(c.dim('    __CTL_NAME__ status            查看状态'));
  console.log(c.dim('    __CTL_NAME__ autostart on      启用开机自启'));
  console.log(c.bold('='.repeat(50)));
}

main().catch(e => { error(e.message); });
