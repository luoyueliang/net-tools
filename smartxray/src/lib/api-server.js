/**
 * API 服务器模块
 * 封装 Web API 路由和服务器逻辑
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const {
  getSetting,
  setSetting,
  cleanupExpiredVerifications,
  db,
  getUserByCredentials
} = require('./database');

const {
  API_PORT,
  UI_DIR,
  XRAY_CONF,
  MIHOMO_OUT,
  isRunning,
  readPid,
  getServerHost,
  getFixedPortRange,
  getSsPortRange
} = require('./config');

const { getRealityConfig } = require('./reality');

const {
  cleanupExpiredUsers
} = require('./user-manager');

// 导入路由模块
const routes = require('./routes');

// 导入工具函数
const { apiResponse, parseBody } = require('./utils');

// ==================== 命令注入 ====================
// xray-ctl 启动前调用 registerCommands() 注入 cmdStart/cmdStop/cmdReload 等
let _commands = {};
function registerCommands(cmds) { _commands = cmds; }

// ==================== 工具函数 ====================

/**
 * 解析 Cookie
 */
function parseCookies(str) {
  return (str || '').split(';').reduce((acc, v) => {
    const [k, ...rest] = v.trim().split('=');
    if (k) acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function makeUserToken(username, password) {
  return crypto.createHash('sha256').update(`smartxray-user:${username}:${password}`).digest('hex').slice(0, 32);
}

function getUserFromToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies._sxutoken;
  if (!token) return null;
  const users = db().prepare('SELECT * FROM users WHERE enabled=1').all();
  for (const u of users) {
    if (makeUserToken(u.username, u.password) === token) return u;
  }
  return null;
}

/**
 * 发送邮件
 */
async function sendMail(to, subject, text) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: getSetting('smtp_host'),
    port: parseInt(getSetting('smtp_port', '587')),
    secure: getSetting('smtp_secure', '0') === '1',
    auth: { user: getSetting('smtp_user'), pass: getSetting('smtp_pass') }
  });
  await transporter.sendMail({
    from: getSetting('smtp_from', getSetting('smtp_user')),
    to, subject, text
  });
}

/**
 * 检查自助申请条件
 */
function checkSelfserviceConditions() {
  const errors = [];
  if (!getSetting('smtp_host', '')) errors.push('未配置 SMTP');
  const pr = getSsPortRange(getSetting);
  if (pr.socksMin >= pr.socksMax) errors.push('自助端口区间未配置');
  return errors;
}

/**
 * 清理过期账户
 */
function cleanupExpired() {
  const count = cleanupExpiredUsers();
  if (count > 0) {
    console.log(`[cleanup] 清理了 ${count} 个过期用户`);
  }
  cleanupExpiredVerifications();
}


// ==================== API 服务器 ====================

let _apiServerRunning = false;

/**
 * 启动 API 服务器
 */
function startApiServer() {
  if (_apiServerRunning) {
    console.log(`  API server 已在运行 (port ${API_PORT})`);
    return;
  }

  const server = http.createServer(async (req, res) => {
    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      });
      return res.end();
    }

    const url = new URL(req.url, `http://localhost:${API_PORT}`);
    const pathname = url.pathname;
    const method = req.method;

    try {
      // 解析请求体
      const json = method !== 'GET' ? await parseBody(req) : {};

      // 静态文件服务
      if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        const htmlFile = path.join(UI_DIR, 'index.html');
        if (fs.existsSync(htmlFile)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(fs.readFileSync(htmlFile));
        }
      }

      // 自助页面
      if (method === 'GET' && (pathname === '/self' || pathname === '/self.html')) {
        const htmlFile = path.join(UI_DIR, 'self-service.html');
        if (fs.existsSync(htmlFile)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(fs.readFileSync(htmlFile));
        }
      }

      // 用户页面
      if (method === 'GET' && (pathname === '/user' || pathname === '/user.html')) {
        const htmlFile = path.join(UI_DIR, 'user.html');
        if (fs.existsSync(htmlFile)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(fs.readFileSync(htmlFile));
        }
      }

      // 门户页面
      if (method === 'GET' && (pathname === '/portal' || pathname === '/portal.html')) {
        const htmlFile = path.join(UI_DIR, 'portal.html');
        if (fs.existsSync(htmlFile)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(fs.readFileSync(htmlFile));
        }
      }

      // API 路由
      if (pathname.startsWith('/api/')) {
        // 登录
        if (method === 'POST' && pathname === '/api/login') {
          return await routes.handleLogin(req, res, json);
        }

        // 登出
        if (method === 'POST' && pathname === '/api/logout') {
          return await routes.handleLogout(req, res);
        }

        // 验证 token
        if (method === 'POST' && pathname === '/api/verify-token') {
          return await routes.handleVerifyToken(req, res, json);
        }

        // GET /api/status — 概览页用
        if (method === 'GET' && pathname === '/api/status') {
          return apiResponse(res, 200, {
            running: isRunning(),
            pid:     readPid(),
            users:   db().prepare('SELECT * FROM users ORDER BY port').all(),
            config:  { server_ip: getSetting('server_ip'), log_level: getSetting('log_level') },
          });
        }

        // 用户列表
        if (method === 'GET' && pathname === '/api/users') {
          return routes.handleUserList(req, res);
        }

        // 添加用户
        if (method === 'POST' && pathname === '/api/users') {
          return await routes.handleUserAdd(req, res, json);
        }

        // 删除用户
        if (method === 'DELETE' && pathname === '/api/users') {
          return await routes.handleUserDelete(req, res, json);
        }

        // 用户操作
        if (method === 'PATCH' && pathname.startsWith('/api/users/')) {
          const action = pathname.split('/').pop();
          return await routes.handleUserAction(req, res, json, action);
        }

        // 获取统计信息
        if (method === 'GET' && pathname === '/api/stats') {
          return routes.handleUserStats(req, res);
        }

        // Reality 操作
        if (method === 'POST' && pathname.startsWith('/api/reality/')) {
          const { handleRealityAction } = require('./reality');
          const action = pathname.split('/').pop();
          return await handleRealityAction(req, res, json, action);
        }

        // 自助申请
        if (method === 'POST' && pathname === '/api/selfservice/apply') {
          return await routes.handleSelfserviceApply(req, res, json);
        }

        // 发送验证码
        if (method === 'POST' && pathname === '/api/selfservice/send-code') {
          return await routes.handleSendCode(req, res, json);
        }

        // 自助申请状态
        if (method === 'GET' && pathname === '/api/selfservice/status') {
          return routes.handleSelfserviceStatus(req, res);
        }

        // 获取设置
        if (method === 'GET' && pathname === '/api/settings') {
          return routes.handleGetSettings(req, res);
        }

        // 更新设置
        if (method === 'POST' && pathname === '/api/settings') {
          return routes.handleUpdateSettings(req, res, json);
        }

        // 获取单个设置
        if (method === 'GET' && pathname.startsWith('/api/settings/')) {
          const key = pathname.split('/').pop();
          return routes.handleGetSetting(req, res, key);
        }

        // 更新单个设置
        if (method === 'PATCH' && pathname.startsWith('/api/settings/')) {
          const key = pathname.split('/').pop();
          return routes.handleUpdateSetting(req, res, key, json);
        }

        // 防火墙同步
        if (method === 'POST' && pathname === '/api/firewall/sync') {
          return routes.handleFirewallSync(req, res);
        }

        // 防火墙状态
        if (method === 'GET' && pathname === '/api/firewall/status') {
          return routes.handleFirewallStatus(req, res);
        }

        // ── 用户端 API（cookie 认证）────────────────────────
        // POST /api/user/login
        if (method === 'POST' && pathname === '/api/user/login') {
          const { username: uname, password: upwd } = json;
          if (!uname || !upwd) return apiResponse(res, 400, { error: '请输入用户名和密码' });
          const user = getUserByCredentials(uname, upwd);
          if (!user) return apiResponse(res, 401, { error: '用户名或密码错误' });
          const utoken = makeUserToken(uname, upwd);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': `_sxutoken=${utoken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(JSON.stringify({ ok: true, name: user.name }));
        }

        // POST /api/user/logout
        if (method === 'POST' && pathname === '/api/user/logout') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': '_sxutoken=; Path=/; HttpOnly; Max-Age=0',
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(JSON.stringify({ ok: true }));
        }

        // GET /api/user/me
        if (method === 'GET' && pathname === '/api/user/me') {
          const user = getUserFromToken(req);
          if (!user) return apiResponse(res, 401, { error: '未登录' });
          const serverIp = getServerHost(getSetting);
          const reality  = getRealityConfig();
          const sharedSocks = parseInt(getSetting('shared_socks_port', '0')) || 0;
          const sharedHttp  = parseInt(getSetting('shared_http_port', '0'))  || 0;
          const socksPort = sharedSocks || user.port;
          const httpPort  = sharedHttp  || user.http_port;
          const proxies = {};
          if (socksPort) {
            proxies.socks5  = `socks5://${encodeURIComponent(user.username)}:${encodeURIComponent(user.password)}@${serverIp}:${socksPort}`;
            proxies.socks5h = `socks5h://${encodeURIComponent(user.username)}:${encodeURIComponent(user.password)}@${serverIp}:${socksPort}`;
          }
          if (httpPort) {
            proxies.http  = `http://${encodeURIComponent(user.username)}:${encodeURIComponent(user.password)}@${serverIp}:${httpPort}`;
            proxies.https = proxies.http;
          }
          if (reality.enabled && reality.publicKey && user.uuid) {
            proxies.vless_link =
              `vless://${user.uuid}@${serverIp}:${reality.port}` +
              `?type=tcp&security=reality` +
              `&sni=${encodeURIComponent(reality.serverNames[0] || '')}` +
              `&pbk=${encodeURIComponent(reality.publicKey)}` +
              `&sid=${encodeURIComponent(reality.shortIds[0] || '')}` +
              `&flow=xtls-rprx-vision#xray-${user.name}`;
            proxies.vless_detail = {
              server: serverIp, port: reality.port, uuid: user.uuid,
              sni: reality.serverNames[0] || '',
              publicKey: reality.publicKey,
              shortId: reality.shortIds[0] || '',
            };
          }
          return apiResponse(res, 200, {
            name: user.name, username: user.username, password: user.password,
            enabled: !!user.enabled, expires_at: user.expires_at, created_at: user.created_at,
            socks_port: socksPort, http_port: httpPort, server_ip: serverIp, proxies,
          });
        }

        // ── 服务控制（需通过 registerCommands 注入）────────
        // POST /api/start
        if (method === 'POST' && pathname === '/api/start') {
          if (!_commands.cmdStart) return apiResponse(res, 500, { error: '命令未注册' });
          try {
            await _commands.cmdStart();
            return apiResponse(res, 200, { running: isRunning() });
          } catch (e) { return apiResponse(res, 500, { error: e.message }); }
        }

        // POST /api/stop
        if (method === 'POST' && pathname === '/api/stop') {
          if (!_commands.cmdStop) return apiResponse(res, 500, { error: '命令未注册' });
          _commands.cmdStop();
          return apiResponse(res, 200, { running: false });
        }

        // POST /api/reload
        if (method === 'POST' && pathname === '/api/reload') {
          if (!_commands.cmdReload) return apiResponse(res, 500, { error: '命令未注册' });
          _commands.cmdReload();
          return apiResponse(res, 200, { ok: true });
        }

        // GET /api/export — 导出 mihomo proxies
        if (method === 'GET' && pathname === '/api/export') {
          const yaml = fs.existsSync(MIHOMO_OUT) ? fs.readFileSync(MIHOMO_OUT, 'utf8') : '# no proxies\n';
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(yaml);
        }

        // ── 自助申请（兼容旧路径）────────────────────────────
        // POST /api/self/request
        if (method === 'POST' && pathname === '/api/self/request') {
          return await routes.handleSendCode(req, res, json);
        }

        // POST /api/self/verify
        if (method === 'POST' && pathname === '/api/self/verify') {
          return await routes.handleSelfserviceApply(req, res, json);
        }

        // ── 防火墙配置 ──────────────────────────────────────
        // GET /api/firewall
        if (method === 'GET' && pathname === '/api/firewall') {
          const fpr = getFixedPortRange(getSetting);
          const spr = getSsPortRange(getSetting);
          return apiResponse(res, 200, {
            mode:               getSetting('extfw_mode', 'none'),
            lightsail_instance: getSetting('lightsail_instance', ''),
            openwrt_host:       getSetting('openwrt_host', ''),
            openwrt_user:       getSetting('openwrt_user', 'root'),
            openwrt_ssh_key:    getSetting('openwrt_ssh_key', ''),
            openwrt_dest_ip:    getSetting('openwrt_dest_ip', ''),
            port_fixed_socks_min: fpr.socksMin, port_fixed_socks_max: fpr.socksMax,
            port_fixed_http_min:  fpr.httpMin,  port_fixed_http_max:  fpr.httpMax,
            port_ss_socks_min:    spr.socksMin, port_ss_socks_max:    spr.socksMax,
            port_ss_http_min:     spr.httpMin,  port_ss_http_max:     spr.httpMax,
          });
        }

        // POST /api/firewall
        if (method === 'POST' && pathname === '/api/firewall') {
          const fields = ['extfw_mode','lightsail_instance','openwrt_host','openwrt_user','openwrt_ssh_key','openwrt_dest_ip',
            'port_fixed_socks_min','port_fixed_socks_max','port_fixed_http_min','port_fixed_http_max',
            'port_ss_socks_min','port_ss_socks_max','port_ss_http_min','port_ss_http_max'];
          for (const f of fields) {
            if (json[f] !== undefined) setSetting(f, String(json[f]));
          }
          return apiResponse(res, 200, { ok: true });
        }

        // ── 自助申请管理（管理端）───────────────────────────
        // GET /api/selfservice
        if (method === 'GET' && pathname === '/api/selfservice') {
          const fpr = getFixedPortRange(getSetting);
          const spr = getSsPortRange(getSetting);
          return apiResponse(res, 200, {
            enabled: getSetting('selfservice_enabled') === '1',
            hours:   parseInt(getSetting('selfservice_hours', '2')) || 2,
            conditions: checkSelfserviceConditions(),
            port_ranges: { fixed: fpr, ss: spr },
          });
        }

        // POST /api/selfservice
        if (method === 'POST' && pathname === '/api/selfservice') {
          if (typeof json.enabled !== 'undefined') {
            if (json.enabled) {
              const errors = checkSelfserviceConditions();
              if (errors.length) return apiResponse(res, 400, { error: '无法开启: ' + errors.join('; ') });
            }
            setSetting('selfservice_enabled', json.enabled ? '1' : '0');
          }
          if (json.hours !== undefined) {
            const h = parseInt(json.hours);
            if (h >= 1) setSetting('selfservice_hours', String(h));
          }
          return apiResponse(res, 200, { ok: true });
        }

        // ── 原始配置 ────────────────────────────────────────
        // GET /api/config/raw
        if (method === 'GET' && pathname === '/api/config/raw') {
          const content = fs.existsSync(XRAY_CONF) ? fs.readFileSync(XRAY_CONF, 'utf8') : '{}';
          return apiResponse(res, 200, { content });
        }

        // POST /api/config/raw
        if (method === 'POST' && pathname === '/api/config/raw') {
          if (!json.content) return apiResponse(res, 400, { error: '缺少 content 字段' });
          try {
            JSON.parse(json.content);
            fs.writeFileSync(XRAY_CONF, json.content);
            if (_commands.cmdReload) _commands.cmdReload();
            return apiResponse(res, 200, { ok: true });
          } catch (e) {
            return apiResponse(res, 400, { error: 'JSON 格式错误: ' + e.message });
          }
        }

        // ── 公开 API（无需认证）─────────────────────────────
        // GET /api/help
        if (method === 'GET' && pathname === '/api/help') {
          const helpFile = path.join(UI_DIR, 'help.md');
          const md = fs.existsSync(helpFile) ? fs.readFileSync(helpFile, 'utf8') : '';
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          return res.end(md);
        }

        // GET /api/shared
        if (method === 'GET' && pathname === '/api/shared') {
          return apiResponse(res, 200, {
            shared_socks_port: parseInt(getSetting('shared_socks_port', '0')) || 0,
            shared_http_port:  parseInt(getSetting('shared_http_port', '0'))  || 0,
            server_ip: getServerHost(getSetting),
          });
        }

        // GET /api/public/info
        if (method === 'GET' && pathname === '/api/public/info') {
          const reality = getRealityConfig();
          const result = { reality_enabled: reality.enabled };
          if (reality.enabled) {
            result.reality_port   = reality.port;
            result.reality_sni    = reality.serverNames[0] || '';
            result.reality_pubkey = reality.publicKey || '';
            result.reality_sid    = reality.shortIds[0] || '';
          }
          return apiResponse(res, 200, result);
        }

        // ── SMTP 配置 ───────────────────────────────────────
        // GET /api/smtp
        if (method === 'GET' && pathname === '/api/smtp') {
          return apiResponse(res, 200, {
            smtp_host:   getSetting('smtp_host', ''),
            smtp_port:   parseInt(getSetting('smtp_port', '587')) || 587,
            smtp_secure: getSetting('smtp_secure', '0') === '1',
            smtp_user:   getSetting('smtp_user', ''),
            smtp_pass:   getSetting('smtp_pass', '') ? '••••••' : '',
            smtp_from:   getSetting('smtp_from', ''),
          });
        }

        // POST /api/smtp
        if (method === 'POST' && pathname === '/api/smtp') {
          if (json.smtp_host !== undefined) setSetting('smtp_host', json.smtp_host);
          if (json.smtp_port !== undefined) setSetting('smtp_port', String(json.smtp_port));
          if (json.smtp_secure !== undefined) setSetting('smtp_secure', json.smtp_secure ? '1' : '0');
          if (json.smtp_user !== undefined) setSetting('smtp_user', json.smtp_user);
          if (json.smtp_pass !== undefined && json.smtp_pass !== '••••••') setSetting('smtp_pass', json.smtp_pass);
          if (json.smtp_from !== undefined) setSetting('smtp_from', json.smtp_from);
          return apiResponse(res, 200, { ok: true });
        }

        // POST /api/smtp/test
        if (method === 'POST' && pathname === '/api/smtp/test') {
          if (!json.to) return apiResponse(res, 400, { error: '请填写测试收件地址' });
          try {
            await sendMail(json.to, '【SmartXray】SMTP 测试', '这是一封测试邮件，如果你收到说明 SMTP 配置正确。\n\n— SmartXray');
            return apiResponse(res, 200, { ok: true });
          } catch (e) {
            return apiResponse(res, 500, { error: 'SMTP 发送失败: ' + e.message });
          }
        }

        // 404
        return apiResponse(res, 404, { error: 'API 端点不存在' });
      }

      // 静态资源
      const staticFile = path.join(UI_DIR, pathname);
      if (fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
        const ext = path.extname(staticFile);
        const contentType = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        }[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(fs.readFileSync(staticFile));
      }

      // 404
      res.writeHead(404);
      res.end('Not Found');

    } catch (e) {
      console.error('API 错误:', e);
      apiResponse(res, 500, { error: '服务器内部错误' });
    }
  });

  server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
      console.log(`  API server 已在运行 (port ${API_PORT})`);
    } else {
      console.error(`  API server 错误: ${e.message}`);
    }
  });

  server.listen(API_PORT, '0.0.0.0', () => {
    _apiServerRunning = true;
    console.log(`  Web UI: http://0.0.0.0:${API_PORT}/  (or http://<server-ip>:${API_PORT}/)`);

    // 定期清理过期账户
    cleanupExpired();
    setInterval(cleanupExpired, 60 * 1000);
  });
}

/**
 * 停止 API 服务器
 */
function stopApiServer() {
  _apiServerRunning = false;
}

module.exports = {
  startApiServer,
  stopApiServer,
  registerCommands,
  apiResponse
};
