#!/usr/bin/env node
// release.js — 混淆打包 mihomo-ctl 为单文件发行版
// 用法:
//   node scripts/release.js              本地构建（生成 dist/*.gz）
//   node scripts/release.js --publish    构建 + 发布到 GitHub Release（需 gh CLI 已登录）
//
// 输出: dist/mihomo-ctl-{ver}-{platform}-{arch}.gz
// 平台: darwin-arm64 | darwin-x64 | linux-x64 | linux-arm64
//
// 依赖: javascript-obfuscator（npm install 自动安装）
// 步骤:
//   1. 把 ui/index.html base64 内联到 JS，消除对源码目录的依赖
//   2. javascript-obfuscator: 字符串数组 base64 编码 + hex 变量名混淆
//   3. 输出 dist/mihomo-ctl（源文件），再 gzip 为带平台版本的发行包

'use strict';

const JavaScriptObfuscator = require('javascript-obfuscator');
const { execSync } = require('child_process');
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── 路径 ──────────────────────────────────────────────────────────────────────
const rootDir  = path.join(__dirname, '..');
const srcFile  = path.join(rootDir, 'src', 'mihomo-ctl');
const htmlFile = path.join(rootDir, 'ui', 'index.html');
const distDir  = path.join(rootDir, 'dist');

// ── CLI 参数 ──────────────────────────────────────────────────────────────────
const PUBLISH = process.argv.includes('--publish');

// ── 版本号 ────────────────────────────────────────────────────────────────────
function readVersion() {
  const m = fs.readFileSync(srcFile, 'utf8').match(/^const VERSION\s*=\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : '0.0.0';
}
const VERSION = readVersion();

// ── 平台（当前构建机） ─────────────────────────────────────────────────────────
const platMap = { darwin: 'darwin', linux: 'linux', freebsd: 'linux' };
const archMap = { arm64: 'arm64', x64: 'x64' };
const PLAT = process.env.TARGET_PLAT || platMap[os.platform()] || 'linux';
const ARCH = process.env.TARGET_ARCH || archMap[os.arch()] || os.arch();

// ── 包名工具函数 ───────────────────────────────────────────────────────────────
// 格式: mihomo-ctl-{ver}-{platform}-{arch}.gz
function assetName(ver, plat, arch) {
  return `mihomo-ctl-${ver}-${plat}-${arch}.gz`;
}
const GZ_FILE = path.join(distDir, assetName(VERSION, PLAT, ARCH));
const RAW_FILE = path.join(distDir, 'mihomo-ctl');  // 未 gzip 的中间文件

// ── 颜色 ─────────────────────────────────────────────────────────────────────
const c = {
  g: s => `\x1b[32m${s}\x1b[0m`,
  b: s => `\x1b[34m${s}\x1b[0m`,
  y: s => `\x1b[33m${s}\x1b[0m`,
  r: s => `\x1b[31m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};
const log  = m => console.log(`${c.b('[info]')}  ${m}`);
const ok   = m => console.log(`${c.g('[done]')}  ${m}`);
const warn = m => console.log(`${c.y('[warn]')}  ${m}`);
const die  = m => { console.error(`${c.r('[err]')}   ${m}`); process.exit(1); };

console.log();
console.log(c.bold(`mihomo-ctl v${VERSION} — 混淆打包  [${PLAT}-${ARCH}]`));
console.log('─'.repeat(52));

// ── Step 1: 读源码 ────────────────────────────────────────────────────────────
log('读取源码...');
let src = fs.readFileSync(srcFile, 'utf8');

// 剥离 shebang（obfuscator 不接受 shebang）
const shebang = '#!/usr/bin/env node\n';
if (src.startsWith('#!')) src = src.slice(src.indexOf('\n') + 1);

// ── Step 2: 内联 UI HTML（base64）────────────────────────────────────────────
const htmlExists = fs.existsSync(htmlFile);
if (!htmlExists) warn('ui/index.html 不存在，ui install 命令将不可用');

const htmlB64 = htmlExists ? fs.readFileSync(htmlFile).toString('base64') : '';

// 在 require('fs') 之后注入 _BUNDLED_UI_ 常量
src = src.replace(
  /(const fs\s*=\s*require\('fs'\);)/,
  `$1\nconst _BUNDLED_UI_ = '${htmlB64}';`
);

// 把文件系统读取替换为内联常量（cmdUi install 路径）
const OLD_UI = [
  "    if (!fs.existsSync(srcUi)) {",
  "      console.log(c.red(`\u2717 \u627e\u4e0d\u5230 UI \u6e90\u6587\u4ef6: ${srcUi}`));",
  "      console.log(c.dim('  \u8bf7\u4ece\u4ed3\u5e93\u76ee\u5f55\u8fd0\u884c\uff0c\u6216\u5148 git clone net-tools'));",
  "      return;",
  "    }",
  "    fs.mkdirSync(dstUi, { recursive: true });",
  "    fs.copyFileSync(srcUi, path.join(dstUi, 'index.html'));",
].join('\n');

const NEW_UI = [
  "    if (!_BUNDLED_UI_) {",
  "      console.log(c.red('\u2717 UI \u672a\u5185\u8054\uff0c\u8bf7\u4ece\u6e90\u7801\u76ee\u5f55\u8fd0\u884c'));",
  "      return;",
  "    }",
  "    fs.mkdirSync(dstUi, { recursive: true });",
  "    fs.writeFileSync(path.join(dstUi, 'index.html'), Buffer.from(_BUNDLED_UI_, 'base64').toString('utf8'));",
].join('\n');

if (src.includes(OLD_UI)) {
  src = src.replace(OLD_UI, NEW_UI);
  ok(`HTML \u5185\u8054\u5b8c\u6210 (${(htmlB64.length * 0.75 / 1024).toFixed(0)} KB)`);
} else {
  warn('\u672a\u627e\u5230 UI copyFileSync \u5757\uff0c\u8df3\u8fc7\u5185\u8054\u66ff\u6362');
}

// ── Step 3: 混淆 ──────────────────────────────────────────────────────────────
log('\u6df7\u6dc6\u4e2d\uff08javascript-obfuscator\uff09...');
let obfuscated;
try {
  const result = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.85,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    splitStrings: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    renameProperties: false,
    numbersToExpressions: true,
    simplify: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    debugProtection: false,
    transformObjectKeys: false,
    disableConsoleOutput: false,
  });
  obfuscated = shebang + result.getObfuscatedCode() + '\n';
} catch (e) {
  die(`\u6df7\u6dc6\u5931\u8d25: ${e.message}`);
}
ok('\u6df7\u6dc6\u5b8c\u6210');

// ── Step 4: 写 dist/mihomo-ctl（原始混淆文件）────────────────────────────────
fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(RAW_FILE)) fs.rmSync(RAW_FILE, { force: true });
fs.writeFileSync(RAW_FILE, obfuscated, 'utf8');
fs.chmodSync(RAW_FILE, 0o755);

// ── Step 5: gzip → dist/mihomo-ctl-{ver}-{platform}-{arch}.gz ────────────────
log(`\u6253\u5305 ${path.basename(GZ_FILE)}...`);
if (fs.existsSync(GZ_FILE)) fs.rmSync(GZ_FILE, { force: true });
const gzipped = zlib.gzipSync(fs.readFileSync(RAW_FILE), { level: 9 });
fs.writeFileSync(GZ_FILE, gzipped);

const rawKB = (fs.statSync(RAW_FILE).size / 1024).toFixed(0);
const gzKB  = (gzipped.length / 1024).toFixed(0);
ok(`${path.basename(GZ_FILE)}  (${rawKB} KB \u2192 ${gzKB} KB gz)`);

// 纯 JS 脚本，内容与平台无关——复制出所有平台的 gz（文件名不同，内容相同）
const ALL_TARGETS = [
  ['darwin', 'arm64'], ['darwin', 'x64'],
  ['linux',  'x64'],   ['linux',  'arm64'],
];
for (const [p, a] of ALL_TARGETS) {
  const f = path.join(distDir, assetName(VERSION, p, a));
  if (f !== GZ_FILE) { fs.copyFileSync(GZ_FILE, f); }
}
ok(`已生成全部 4 个平台 gz（内容相同）`);

// ── Step 6: installer tar.gz（完整目录结构，含所有平台 plist/service + config 模板）──
// 结构与仓库 mihomo/ 目录一致，解压后直接 node scripts/install.js 即可
// 包含: scripts/（install.js + platform/**）、src/mihomo-ctl（混淆版）、config/
const installerName = `mihomo-ctl-installer-${VERSION}`;
const installerTar  = path.join(distDir, `${installerName}.tar.gz`);
const pkgDir        = path.join(distDir, '_pkg', installerName);

// 清理旧包目录
if (fs.existsSync(path.join(distDir, '_pkg'))) fs.rmSync(path.join(distDir, '_pkg'), { recursive: true, force: true });

// 递归复制目录（排除列表）
function copyDir(src, dst, exclude = []) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d, exclude);
    else { fs.copyFileSync(s, d); fs.chmodSync(d, fs.statSync(s).mode); }
  }
}

// 复制 scripts/（含 platform/**），排除 release.js 本身
copyDir(path.join(rootDir, 'scripts'), path.join(pkgDir, 'scripts'), ['release.js']);
// 复制 config/（模板）
copyDir(path.join(rootDir, 'config'), path.join(pkgDir, 'config'));
// 复制 ui/（install.js 里的 installUi() 需要）
if (fs.existsSync(path.join(rootDir, 'ui'))) {
  copyDir(path.join(rootDir, 'ui'), path.join(pkgDir, 'ui'));
}
// src/mihomo-ctl 用混淆版替换
fs.mkdirSync(path.join(pkgDir, 'src'), { recursive: true });
fs.copyFileSync(RAW_FILE, path.join(pkgDir, 'src', 'mihomo-ctl'));
fs.chmodSync(path.join(pkgDir, 'src', 'mihomo-ctl'), 0o755);

if (fs.existsSync(installerTar)) fs.rmSync(installerTar, { force: true });
execSync(`tar czf "${installerTar}" -C "${path.join(distDir, '_pkg')}" "${installerName}"`, { stdio: 'pipe' });
fs.rmSync(path.join(distDir, '_pkg'), { recursive: true, force: true });

const tarKB = (fs.statSync(installerTar).size / 1024).toFixed(0);
ok(`${path.basename(installerTar)}  (${tarKB} KB)`);

// ── Step 7: manifest ──────────────────────────────────────────────────────────
const manifest = {
  version:   VERSION,
  built_at:  new Date().toISOString(),
  gz_asset:  path.basename(GZ_FILE),
  installer: path.basename(installerTar),
  platform:  PLAT,
  arch:      ARCH,
};
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// ── Step 8: 可选发布到 GitHub Release ─────────────────────────────────────────
if (PUBLISH) {
  console.log();
  log('发布到 GitHub Release...');
  const tag = `mihomo-ctl-v${VERSION}`;

  try { execSync('gh --version', { stdio: 'pipe' }); }
  catch { die('gh CLI 未安装，请先安装 GitHub CLI: https://cli.github.com'); }

  try {
    execSync(`gh release create "${tag}" --title "mihomo-ctl v${VERSION}" --generate-notes --repo luoyueliang/net-tools`, { stdio: 'pipe' });
    ok(`Release ${tag} 已创建`);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) warn(`Release ${tag} 已存在，直接上传资产`);
    else die(`创建 Release 失败: ${e.message}`);
  }

  // 上传 installer + 平台 gz
  execSync(`gh release upload "${tag}" "${installerTar}" "${GZ_FILE}" --clobber --repo luoyueliang/net-tools`, { stdio: 'inherit' });
  ok(`已上传: ${path.basename(installerTar)}, ${path.basename(GZ_FILE)}`);
}

// ── 完成 ──────────────────────────────────────────────────────────────────────
console.log();
console.log('─'.repeat(52));
ok(`dist/${path.basename(GZ_FILE)}  (${gzKB} KB gz)   ← upgrade 用`);
ok(`dist/${path.basename(installerTar)}  (${tarKB} KB)   ← 安装用`);
if (!PUBLISH) {
  console.log(c.y(`发布: node scripts/release.js --publish`));
  console.log(c.b(`或由 GitHub Actions 在 tag push 后自动构建`));
}
console.log();
console.log(`安装验证: ${c.b(`tar xzf dist/${path.basename(installerTar)} && ls ${installerName}/`)}`);

