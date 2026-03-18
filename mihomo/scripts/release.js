#!/usr/bin/env node
// release.js — 混淆打包 mihomo-ctl 为单文件发行版
// 用法: node scripts/release.js  /  npm run pack
// 输出: dist/mihomo-ctl（混淆 JS，目标机器已有 node，~200-400 KB）
//
// 依赖: javascript-obfuscator（npm install 自动安装）
// 步骤:
//   1. 把 ui/index.html base64 内联到 JS，消除对源码目录的依赖
//   2. javascript-obfuscator: 字符串数组 base64 编码 + hex 变量名混淆
//   3. 输出 dist/mihomo-ctl，保留 shebang，chmod +x 直接可用

'use strict';

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs   = require('fs');
const path = require('path');

// ── 路径 ──────────────────────────────────────────────────────────────────────
const rootDir  = path.join(__dirname, '..');
const srcFile  = path.join(rootDir, 'src', 'mihomo-ctl');
const htmlFile = path.join(rootDir, 'ui', 'index.html');
const distDir  = path.join(rootDir, 'dist');
const outFile  = path.join(distDir, 'mihomo-ctl');

// ── 版本号 ────────────────────────────────────────────────────────────────────
function readVersion() {
  const m = fs.readFileSync(srcFile, 'utf8').match(/^const VERSION\s*=\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : '0.0.0';
}
const VERSION = readVersion();

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
console.log(c.bold(`mihomo-ctl v${VERSION} — 混淆打包`));
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

// ── Step 4: 写输出 ────────────────────────────────────────────────────────────
fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(outFile)) fs.rmSync(outFile, { force: true });
fs.writeFileSync(outFile, obfuscated, 'utf8');
fs.chmodSync(outFile, 0o755);

// ── Step 5: manifest ──────────────────────────────────────────────────────────
const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(0);
fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify({ version: VERSION, built_at: new Date().toISOString(), files: ['mihomo-ctl'] }, null, 2) + '\n'
);

// ── 完成 ──────────────────────────────────────────────────────────────────────
console.log('\u2500'.repeat(52));
ok(`dist/mihomo-ctl  (${sizeKB} KB)  \u2014 \u9700\u8981\u76ee\u6807\u673a\u5668\u5df2\u5b89\u88c5 node`);
console.log();
console.log(`\u9a8c\u8bc1: ${c.b('./dist/mihomo-ctl help')}`);
console.log(`\u5b89\u88c5: ${c.b('sudo cp dist/mihomo-ctl /usr/local/bin/')}`);
