#!/usr/bin/env node
// release.js — 将 mihomo-ctl 打包为当前平台独立二进制（Node.js SEA）
// 用法: node scripts/release.js
//       或  npm run pack
// 输出: dist/mihomo-ctl-<os>-<arch>
//
// 依赖: postject (npm install 自动安装)
// 备注: Homebrew 的 node 是动态库拆分构建，不含 SEA fuse sentinel，
//       本脚本会自动从 nodejs.org 下载单体 node binary（仅首次需要）。

'use strict';

const { execSync } = require('child_process');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

// ── 路径 ──────────────────────────────────────────────────────────────────────
const rootDir  = path.join(__dirname, '..');
const srcFile  = path.join(rootDir, 'src', 'mihomo-ctl');
const distDir  = path.join(rootDir, 'dist');
const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'mihomo-sea-'));
const blobFile = path.join(tmpDir, 'sea.blob');

// ── 版本号 ────────────────────────────────────────────────────────────────────
function readVersion() {
  const m = fs.readFileSync(srcFile, 'utf8').match(/^const VERSION\s*=\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : '0.0.0';
}
const VERSION = readVersion();

// ── 平台映射 ──────────────────────────────────────────────────────────────────
const platMap = { darwin: 'darwin', linux: 'linux', win32: 'windows' };
const archMap = { arm64: 'arm64', x64: 'x64' };
const plat = platMap[os.platform()] || os.platform();
const arch = archMap[os.arch()] || os.arch();
const outName = `mihomo-ctl-${plat}-${arch}`;
const outFile = path.join(distDir, outName);

// Node LTS 单体二进制（SEA base），Homebrew 等拆分构建时使用
const SEA_NODE_VERSION = '22.15.0';
const SEA_NODE_CACHE   = path.join(os.homedir(), '.mihomo-sea-node');
const seaNodeFile      = path.join(SEA_NODE_CACHE, `node-${plat}-${arch}`);

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

function run(cmd) {
  return execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
}

// ── SEA fuse 检测 ─────────────────────────────────────────────────────────────
// 检查 node binary 是否含 SEA fuse sentinel（单体构建才有）
function hasFuse(binPath) {
  try {
    const buf = fs.readFileSync(binPath);
    const fuse = Buffer.from('NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2');
    for (let i = 0; i <= buf.length - fuse.length; i++) {
      if (buf.slice(i, i + fuse.length).equals(fuse)) return true;
    }
    return false;
  } catch { return false; }
}

// ── 下载单体 Node ─────────────────────────────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    function get(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location); return; }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}: ${u}`)); return; }
        const total = parseInt(res.headers['content-length'] || '0');
        let got = 0;
        res.on('data', chunk => {
          got += chunk.length;
          if (total) process.stdout.write(`\r  ${(got / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`);
        });
        res.pipe(file);
        file.on('finish', () => { process.stdout.write('\n'); resolve(); });
      }).on('error', reject);
    }
    get(url);
  });
}

async function getMonolithicNode() {
  // 先检查 cache
  if (fs.existsSync(seaNodeFile) && hasFuse(seaNodeFile)) {
    log(`使用已缓存的单体 Node: ${seaNodeFile}`);
    return seaNodeFile;
  }

  // nodejs.org 平台标识
  const nodeOsMap  = { darwin: 'darwin', linux: 'linux' };
  const nodeArchMap = { arm64: 'arm64', x64: 'x64' };
  const nodeOs   = nodeOsMap[plat]   || die(`不支持的平台: ${plat}`);
  const nodeArch = nodeArchMap[arch] || die(`不支持的架构: ${arch}`);

  const tarName = `node-v${SEA_NODE_VERSION}-${nodeOs}-${nodeArch}.tar.gz`;
  const url     = `https://nodejs.org/dist/v${SEA_NODE_VERSION}/${tarName}`;
  const tarFile = path.join(tmpDir, tarName);

  warn('当前 Node.js 为动态库构建（Homebrew），不含 SEA fuse');
  log(`正在从 nodejs.org 下载单体 Node v${SEA_NODE_VERSION} (${nodeOs}-${nodeArch})...`);
  log(`URL: ${url}`);

  await downloadFile(url, tarFile);

  // 解压，只取 bin/node
  fs.mkdirSync(SEA_NODE_CACHE, { recursive: true });
  const extractDir = path.join(tmpDir, 'node-extract');
  fs.mkdirSync(extractDir);
  execSync(`tar xzf "${tarFile}" -C "${extractDir}" --strip-components=2 "node-v${SEA_NODE_VERSION}-${nodeOs}-${nodeArch}/bin/node"`,
    { stdio: 'pipe' });
  fs.copyFileSync(path.join(extractDir, 'node'), seaNodeFile);
  fs.chmodSync(seaNodeFile, 0o755);
  ok(`单体 Node 已缓存: ${seaNodeFile}`);
  return seaNodeFile;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
(async () => {
  console.log();
  console.log(c.bold(`mihomo-ctl v${VERSION} — Node.js SEA 打包`));
  console.log(`${'─'.repeat(52)}`);
  log(`目标平台: ${plat}-${arch}`);
  log(`Node.js:  ${process.version}`);
  log(`输出文件: dist/${outName}`);
  console.log();

  // 创建 dist/
  fs.mkdirSync(distDir, { recursive: true });

  // 确认 postject 已安装
  const postjectBin = path.join(rootDir, 'node_modules', '.bin', 'postject');
  if (!fs.existsSync(postjectBin)) die('postject 未安装，请先运行: npm install');

  // 确定要用哪个 node binary 作为 SEA base
  let baseNode = process.execPath;
  if (!hasFuse(baseNode)) {
    baseNode = await getMonolithicNode();
    if (!hasFuse(baseNode)) die('下载的 Node binary 也不含 SEA fuse，请检查版本');
  } else {
    log(`当前 Node 支持 SEA: ${baseNode}`);
  }

  // 生成 SEA 配置 & blob（必须用 baseNode 本身来生成，版本必须一致）
  const seaEntry  = path.join(tmpDir, 'entry.cjs');
  const seaConfig = { main: seaEntry, output: blobFile, disableExperimentalSEAWarning: true };
  const seaCfgFile = path.join(tmpDir, 'sea-config.json');
  fs.writeFileSync(seaEntry, fs.readFileSync(srcFile, 'utf8'));
  fs.writeFileSync(seaCfgFile, JSON.stringify(seaConfig, null, 2));

  log(`生成 SEA blob（使用 ${path.basename(baseNode)}）...`);
  try { run(`"${baseNode}" --experimental-sea-config "${seaCfgFile}"`); }
  catch (e) { die(`blob 生成失败: ${e.message}`); }
  ok('blob 生成完成');

  // 复制 base node（先删旧文件避免权限问题）
  log('复制 node 可执行文件...');
  if (fs.existsSync(outFile)) fs.rmSync(outFile, { force: true });
  fs.copyFileSync(baseNode, outFile);
  fs.chmodSync(outFile, 0o755);
  fs.chmodSync(outFile, 0o755);

  // macOS：移除签名
  if (plat === 'darwin') {
    log('移除代码签名（macOS）...');
    try { run(`codesign --remove-signature "${outFile}"`); } catch {}
  }

  // 注入 blob
  log('注入 SEA blob...');
  const macFlag = plat === 'darwin' ? '--macho-segment-name NODE_SEA' : '';
  try {
    run(`"${postjectBin}" "${outFile}" NODE_SEA_BLOB "${blobFile}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ${macFlag}`);
  } catch (e) { die(`注入失败: ${e.message.split('\n')[0]}`); }
  ok('注入完成');

  // macOS：ad-hoc 签名
  if (plat === 'darwin') {
    log('重新签名（ad-hoc）...');
    try { run(`codesign --sign - "${outFile}"`); } catch {}
  }

  // 清理临时文件
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // 写 manifest
  const size = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
  const manifest = { version: VERSION, built_at: new Date().toISOString(), files: [outName] };
  fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`${'─'.repeat(52)}`);
  ok(`构建完成: dist/${outName}  (${size} MB)`);
  console.log();
  console.log(`验证: ${c.b(`./dist/${outName} help`)}`);
})();


