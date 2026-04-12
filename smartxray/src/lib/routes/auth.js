/**
 * 认证路由模块
 * 处理登录/登出 API
 */

const { getSetting, getUserByCredentials } = require('../database');
const { apiResponse } = require('../utils');
const { createToken, verifyToken, deleteToken } = require('../token-cache');

/**
 * 处理登录请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleLogin(req, res, json) {
  const { username, password } = json;
  if (!username || !password) {
    return apiResponse(res, 400, { error: '缺少用户名或密码' });
  }

  // 检查管理员密码
  const adminPassword = getSetting('admin_password', '');
  if (adminPassword && password === adminPassword && username === 'admin') {
    const token = createToken('admin', true);
    return apiResponse(res, 200, { ok: true, token, isAdmin: true });
  }

  // 检查用户登录
  const user = getUserByCredentials(username, password);
  if (user) {
    const token = createToken(user.id, false);
    return apiResponse(res, 200, { 
      ok: true, 
      token, 
      user: { id: user.id, name: user.name } 
    });
  }

  return apiResponse(res, 401, { error: '用户名或密码错误' });
}

/**
 * 处理登出请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleLogout(req, res, json) {
  const { token } = json || {};
  if (token) {
    deleteToken(token);
  }
  return apiResponse(res, 200, { ok: true });
}

/**
 * 处理验证 token 请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleVerifyToken(req, res, json) {
  const { token } = json;
  if (!token) {
    return apiResponse(res, 400, { error: '缺少 token' });
  }

  // 使用缓存验证 token
  const cached = verifyToken(token);
  if (!cached) {
    return apiResponse(res, 401, { error: '无效或过期的 token' });
  }

  if (cached.isAdmin) {
    return apiResponse(res, 200, { valid: true, isAdmin: true });
  }

  // 获取用户信息
  const { getUserById } = require('../database');
  const user = getUserById(cached.userId);
  if (user && user.enabled) {
    return apiResponse(res, 200, { 
      valid: true, 
      isAdmin: false,
      user: { id: user.id, name: user.name }
    });
  }

  // 用户不存在或已禁用，清除 token
  deleteToken(token);
  return apiResponse(res, 401, { error: '用户不存在或已禁用' });
}

module.exports = {
  handleLogin,
  handleLogout,
  handleVerifyToken
};