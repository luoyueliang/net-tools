/**
 * 用户管理路由模块
 * 处理用户 CRUD 操作 API
 */

const { apiResponse } = require('../utils');
const {
  addUser,
  removeUser,
  enableUser,
  disableUser,
  changePassword,
  setUserPort,
  listUsers,
  getUserStats
} = require('../user-manager');
const { getRealityConfig, generateRealityLink } = require('../reality');
const { getServerHost } = require('../config');
const { getSetting } = require('../database');

/**
 * 处理用户列表请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleUserList(req, res) {
  const users = listUsers();
  const reality = getRealityConfig();
  const serverHost = getServerHost(getSetting);

  const result = users.map(u => ({
    ...u,
    socks_link: `socks5://${u.username}:${u.password}@${serverHost}:${u.port}`,
    http_link: u.http_port ? `http://${u.username}:${u.password}@${serverHost}:${u.http_port}` : null,
    reality_link: reality.enabled ? generateRealityLink(u) : null
  }));

  return apiResponse(res, 200, result);
}

/**
 * 处理添加用户请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleUserAdd(req, res, json) {
  try {
    const user = addUser({
      name: json.name,
      username: json.username,
      password: json.password,
      port: json.port,
      httpPort: json.http_port,
      hours: json.hours,
      note: json.note
    });
    return apiResponse(res, 200, user);
  } catch (e) {
    return apiResponse(res, 400, { error: e.message });
  }
}

/**
 * 处理删除用户请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleUserDelete(req, res, json) {
  try {
    const success = removeUser(json.id || json.name);
    return apiResponse(res, 200, { ok: success });
  } catch (e) {
    return apiResponse(res, 400, { error: e.message });
  }
}

/**
 * 处理用户操作请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 * @param {string} action - 操作类型
 */
async function handleUserAction(req, res, json, action) {
  try {
    const identifier = json.id || json.name;
    let result;

    switch (action) {
      case 'enable':
        result = enableUser(identifier);
        break;
      case 'disable':
        result = disableUser(identifier);
        break;
      case 'passwd':
        result = changePassword(identifier, json.password);
        break;
      case 'set-port':
        result = setUserPort(identifier, json.socks_port, json.http_port);
        break;
      default:
        return apiResponse(res, 400, { error: '未知操作' });
    }

    return apiResponse(res, 200, result);
  } catch (e) {
    return apiResponse(res, 400, { error: e.message });
  }
}

/**
 * 处理获取用户统计信息请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleUserStats(req, res) {
  const stats = getUserStats();
  return apiResponse(res, 200, stats);
}

module.exports = {
  handleUserList,
  handleUserAdd,
  handleUserDelete,
  handleUserAction,
  handleUserStats
};