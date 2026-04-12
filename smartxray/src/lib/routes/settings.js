/**
 * 设置路由模块
 * 处理系统设置 API
 */

const { getSetting, setSetting, getAllSettings } = require('../database');
const { apiResponse } = require('../utils');

/**
 * 处理获取设置请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleGetSettings(req, res) {
  const settings = getAllSettings();
  // 隐藏敏感信息
  if (settings.smtp_pass) settings.smtp_pass = '••••••';
  if (settings.admin_password) settings.admin_password = '••••••';
  return apiResponse(res, 200, settings);
}

/**
 * 处理更新设置请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
function handleUpdateSettings(req, res, json) {
  try {
    for (const [key, value] of Object.entries(json)) {
      // 跳过敏感信息的占位符
      if (key === 'smtp_pass' && value === '••••••') continue;
      if (key === 'admin_password' && value === '••••••') continue;
      setSetting(key, String(value));
    }
    return apiResponse(res, 200, { ok: true });
  } catch (e) {
    return apiResponse(res, 400, { error: e.message });
  }
}

/**
 * 处理获取单个设置请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {string} key - 设置键名
 */
function handleGetSetting(req, res, key) {
  const value = getSetting(key, '');
  return apiResponse(res, 200, { key, value });
}

/**
 * 处理更新单个设置请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {string} key - 设置键名
 * @param {Object} json - 请求体
 */
function handleUpdateSetting(req, res, key, json) {
  try {
    const value = json.value;
    if (value === undefined) {
      return apiResponse(res, 400, { error: '缺少 value 字段' });
    }
    setSetting(key, String(value));
    return apiResponse(res, 200, { ok: true, key, value });
  } catch (e) {
    return apiResponse(res, 400, { error: e.message });
  }
}

module.exports = {
  handleGetSettings,
  handleUpdateSettings,
  handleGetSetting,
  handleUpdateSetting
};