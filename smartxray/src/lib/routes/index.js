/**
 * 路由模块索引
 * 导出所有路由处理器
 */

const auth = require('./auth');
const users = require('./users');
const settings = require('./settings');
const selfservice = require('./selfservice');
const firewall = require('./firewall');

module.exports = {
  // 认证路由
  handleLogin: auth.handleLogin,
  handleLogout: auth.handleLogout,
  handleVerifyToken: auth.handleVerifyToken,

  // 用户路由
  handleUserList: users.handleUserList,
  handleUserAdd: users.handleUserAdd,
  handleUserDelete: users.handleUserDelete,
  handleUserAction: users.handleUserAction,
  handleUserStats: users.handleUserStats,

  // 设置路由
  handleGetSettings: settings.handleGetSettings,
  handleUpdateSettings: settings.handleUpdateSettings,
  handleGetSetting: settings.handleGetSetting,
  handleUpdateSetting: settings.handleUpdateSetting,

  // 自助申请路由
  handleSendCode: selfservice.handleSendCode,
  handleSelfserviceApply: selfservice.handleSelfserviceApply,
  handleSelfserviceStatus: selfservice.handleSelfserviceStatus,

  // 防火墙路由
  handleFirewallSync: firewall.handleFirewallSync,
  handleFirewallStatus: firewall.handleFirewallStatus
};