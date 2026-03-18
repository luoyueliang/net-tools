#!/usr/bin/env node
// release.js — 打包 xray-ctl 发行版
// 用法:
//   node scripts/release.js              本地构建（生成 dist/*.gz）
//   node scripts/release.js --publish    构建 + 发布到 GitHub Release（需 gh CLI 已登录）
//
// 输出: dist/xray-ctl-{ver}.gz                    (自升级用)
//       dist/smartxray-installer-{ver}.tar.gz     (安装用)

'use strict';

const { execSync } = require('child_process');
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── 颜色 ─────────────────────────────────────────────────────────────────────
const c = {
  g: s => `\x1b[32m${s}\x1b[0m`,
  y: s => `\x1b[33m${s}\x1b[0m`,
  b: s => `\x1b[34m${s}\x1b[0m`,
  r: s => `\x1b[31m${s}\x1b[0m`,
};
const ok  = s => console.log(c.g('✓ ') + s);
const log = s => console.log(c.b('» ') + s);
const die = s => { console.error(c.r('✗ ') + s); process.exit(1); };

// ── 路径 ─────────────────────────────────────────────────────────────────────
const rootDir  = path.join(__dirname, '..');
const srcFile  = path.join(rootDir, 'src', 'xray-ctl');
const distDir  = path.join(rootDir, 'dist');

// ── CLI 参数 ──────────────────────────────────────────────────────────────────
const PUBLISH = process.argv.includes('--publish');

// ── 版本号（从源码读取）───────────────────────────────────────────────────────
function readVersion() {
  const m = fs.readFileSync(srcFile, 'utf8').match(/^const VERSION\s*=\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : '0.0.0';
}
const VERSION = readVersion();

console.log();
console.log('─'.repeat(52));
log(`smartxray release.js — v${VERSION}`);
console.log('─'.repeat(52));

// ── Step 1: gzip xray-ctl → dist/xray-ctl-{ver}.gz ──────────────────────────
fs.mkdirSync(distDir, { recursive: true });
const GZ_FILE = path.join(distDir, `xray-ctl-${VERSION}.gz`);
log(`打包 ${path.basename(GZ_FILE)}...`);
if (fs.existsSync(GZ_FILE)) fs.rmSync(GZ_FILE, { force: true });
const srcBuf  = fs.readFileSync(srcFile);
const gzipped = zlib.gzipSync(srcBuf, { level: 9 });
fs.writeFileSync(GZ_FILE, gzipped);
const rawKB = (srcBuf.length / 1024).toFixed(0);
const gzKB  = (gzipped.length / 1024).toFixed(0);
ok(`${path.basename(GZ_FILE)}  (${rawKB} KB → ${gzKB} KB gz)`);

// ── Step 2: installer tar.gz ──────────────────────────────────────────────────
const installerName = `smartxray-installer-${VERSION}`;
const installerTar  = path.join(distDir, `${installerName}.tar.gz`);
const pkgDir        = path.join(distDir, '_pkg', installerName);

log(`构建 installer: ${path.basename(installerTar)}`);

if (fs.existsSync(path.join(distDir, '_pkg'))) {
  fs.rmSync(path.join(distDir, '_pkg'), { recursive: true, force: true });
}

function copyDir(src, dst, exclude = []) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (exclude.includes(f)) continue;
    const s = path.join(src, f);
    const d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, exclude);
    else fs.copyFileSync(s, d);
  }
}

// scripts/（排除 release.js 本身）、config/、ui/、src/xray-ctl、package.json
copyDir(path.join(rootDir, 'scripts'), path.join(pkgDir, 'scripts'), ['release.js']);
copyDir(path.join(rootDir, 'config'),  path.join(pkgDir, 'config'));
if (fs.existsSync(path.join(rootDir, 'ui'))) {
  copyDir(path.join(rootDir, 'ui'), path.join(pkgDir, 'ui'));
}
fs.mkdirSync(path.join(pkgDir, 'src'), { recursive: true });
fs.copyFileSync(srcFile, path.join(pkgDir, 'src', 'xray-ctl'));
fs.chmodSync(path.join(pkgDir, 'src', 'xray-ctl'), 0o755);
// package.json 是 better-sqlite3 安装所需的
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(pkgDir, 'package.json'));

if (fs.existsSync(installerTar)) fs.rmSync(installerTar, { force: true });
execSync(
  `tar czf "${installerTar}" -C "${path.join(distDir, '_pkg')}" "${installerName}"`,
  { stdio: 'pipe' }
);
fs.rmSync(path.join(distDir, '_pkg'), { recursive: true, force: true });

const tarKB = (fs.statSync(installerTar).size / 1024).toFixed(0);
ok(`${path.basename(installerTar)}  (${tarKB} KB)`);

// ── Step 3: manifest ──────────────────────────────────────────────────────────
const manifest = {
  version:   VERSION,
  built_at:  new Date().toISOString(),
  gz_asset:  path.basename(GZ_FILE),
  installer: path.basename(installerTar),
};
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// ── Step 4: 可选发布到 GitHub Release ─────────────────────────────────────────
if (PUBLISH) {
  console.log();
  log('发布到 GitHub Release...');
  const tag = `smartxray-v${VERSION}`;

  try { execSync('gh --version', { stdio: 'pipe' }); }
  catch { die('gh CLI 未安装，请先安装 GitHub CLI: https://cli.github.com'); }

  try {
    execSync(
      `gh release create "${tag}" --title "smartxray v${VERSION}" --generate-notes --repo luoyueliang/net-tools`,
      { stdio: 'pipe' }
    );
    ok(`Release ${tag} 已创建`);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log(c.y(`⚠ Release ${tag} 已存在，直接上传资产`));
    } else {
      die(`创建 Release 失败: ${e.message}`);
    }
  }

  execSync(
    `gh release upload "${tag}" "${installerTar}" "${GZ_FILE}" --clobber --repo luoyueliang/net-tools`,
    { stdio: 'inherit' }
  );
  ok(`已上传: ${path.basename(installerTar)}, ${path.basename(GZ_FILE)}`);
}

// ── 完成 ──────────────────────────────────────────────────────────────────────
console.log();
console.log('─'.repeat(52));
ok(`dist/${path.basename(GZ_FILE)}  (${gzKB} KB gz)   ← 自升级用`);
ok(`dist/${path.basename(installerTar)}  (${tarKB} KB)   ← 安装用`);
if (!PUBLISH) {
  console.log(c.y(`发布: node scripts/release.js --publish`));
  console.log(c.b(`或由 GitHub Actions 在 tag push 后自动构建`));
}
console.log();
console.log(`安装验证: ${c.b(`tar xzf dist/${path.basename(installerTar)} && ls ${installerName}/`)}`);
