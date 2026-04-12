/**
 * 防火墙路由模块
 * 处理防火墙操作 API
 */

const { apiResponse } = require('../utils');
const { syncAllPorts } = require('../firewall');
const { listUsers } = require('../user-manager');
const { getRealityConfig } = require('../reality');

/**
 * 处理同步端口请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleFirewallSync(req, res) {
  try {
    const users = listUsers({ enabledOnly: true });
    const realityConfig = getRealityConfig();
    syncAllPorts(users, realityConfig);
    return apiResponse(res, 200, { ok: true, synced: users.length });
  } catch (e) {
    return apiResponse(res, 500, { error: e.message });
  }
}

/**
 * 处理获取防火墙状态请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleFirewallStatus(req, res) {
  try {
    const { detectPlatform } = require('../firewall');
    const platform = detectPlatform();
    const users = listUsers({ enabledOnly: true });
    const realityConfig = getRealityConfig();

    const openPorts = [];
    for (const u of users) {
      openPorts.push({ type: 'socks', port: u.port, user: u.name });
      if (u.http_port) {
        openPorts.push({ type: 'http', port: u.http_port, user: u.name });
      }
    }

    if (realityConfig.enabled && realityConfig.port) {
      openPorts.push({ type: 'reality', port: realityConfig.port, user: 'system' });
    }

    return apiResponse(res, 200, {
      platform,
      openPorts,
      totalPorts: openPorts.length
    });
  } catch (e) {
    return apiResponse(res, 500, { error: e.message });
  }
}

module.exports = {
  handleFirewallSync,
  handleFirewallStatus
};