/**
 * 常量定义模块
 * 集中管理所有硬编码的常量值
 */

'use strict';

// ── 端口相关常量 ──────────────────────────────────────────────────
const PORT = {
  // 默认端口范围
  SOCKS_RANGE: { start: 10000, end: 19999 },
  HTTP_RANGE: { start: 20000, end: 29999 },
  FIXED_RANGE: { start: 30000, end: 39999 },
  
  // API 服务默认端口
  API_DEFAULT: 9091,
  
  // 端口检查超时（毫秒）
  CHECK_TIMEOUT: 2000
};

// ── 超时时间常量 ──────────────────────────────────────────────────
const TIMEOUT = {
  // HTTP 请求超时
  HTTP_REQUEST: 10000,
  HTTP_DOWNLOAD: 120000,
  
  // 代理测试超时
  PROXY_TEST: 8000,
  
  // 进程启动超时
  PROCESS_START: 5000,
  
  // 数据库操作超时
  DB_OPERATION: 5000,
  
  // 缓存 TTL（毫秒）
  CACHE_TTL: 5 * 60 * 1000,  // 5 分钟
  TOKEN_TTL: 24 * 60 * 60 * 1000,  // 24 小时
  
  // 清理间隔
  CLEANUP_INTERVAL: 60 * 60 * 1000,  // 1 小时
  VERIFICATION_CLEANUP: 30 * 60 * 1000  // 30 分钟
};

// ── 默认值常量 ──────────────────────────────────────────────────
const DEFAULTS = {
  // 用户相关
  USER_NAME_LENGTH: 8,
  USER_PASSWORD_LENGTH: 12,
  USER_TOKEN_LENGTH: 32,
  
  // 协议
  PROTOCOL: 'socks',
  
  // 分页
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // 日志
  LOG_LEVEL: 'info',
  LOG_MAX_SIZE: 10 * 1024 * 1024,  // 10 MB
  LOG_MAX_FILES: 5,
  
  // 重试
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// ── 文件路径常量 ──────────────────────────────────────────────────
const PATHS = {
  // 配置文件
  CONFIG_FILE: 'config.json',
  XRAY_CONF: 'xray-config.json',
  
  // 数据库
  DATABASE: 'smartxray.db',
  
  // 日志
  LOG_FILE: 'smartxray.log',
  
  // PID 文件
  PID_FILE: 'smartxray.pid',
  
  // UI 目录
  UI_DIR: 'ui',
  
  // 备份目录
  BACKUP_DIR: 'backups'
};

// ── 正则表达式常量 ──────────────────────────────────────────────────
const REGEX = {
  // 用户名：字母、数字、下划线，3-20 位
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  
  // 密码：至少 6 位
  PASSWORD: /^.{6,}$/,
  
  // 邮箱
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // UUID
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // IPv4
  IPV4: /^(\d{1,3}\.){3}\d{1,3}$/,
  
  // IPv6
  IPV6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  
  // 端口号
  PORT: /^\d{1,5}$/,
  
  // URL
  URL: /^https?:\/\/.+/
};

// ── 错误消息常量 ──────────────────────────────────────────────────
const ERROR_MESSAGES = {
  // 通用
  INTERNAL_ERROR: '服务器内部错误',
  NOT_FOUND: '资源不存在',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  VALIDATION_ERROR: '参数验证失败',
  
  // 用户相关
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户名已存在',
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_DISABLED: '用户已被禁用',
  USER_EXPIRED: '用户已过期',
  
  // 端口相关
  PORT_IN_USE: '端口已被占用',
  PORT_OUT_OF_RANGE: '端口超出范围',
  NO_AVAILABLE_PORT: '没有可用端口',
  
  // 配置相关
  CONFIG_NOT_FOUND: '配置不存在',
  CONFIG_INVALID: '配置格式无效',
  
  // 网络相关
  NETWORK_ERROR: '网络连接错误',
  TIMEOUT_ERROR: '请求超时',
  PROXY_ERROR: '代理连接失败'
};

// ── 成功消息常量 ──────────────────────────────────────────────────
const SUCCESS_MESSAGES = {
  USER_CREATED: '用户创建成功',
  USER_UPDATED: '用户更新成功',
  USER_DELETED: '用户删除成功',
  CONFIG_SAVED: '配置保存成功',
  SERVICE_STARTED: '服务启动成功',
  SERVICE_STOPPED: '服务停止成功',
  PORT_ALLOCATED: '端口分配成功',
  PORT_RELEASED: '端口释放成功'
};

// ── 状态常量 ──────────────────────────────────────────────────
const STATUS = {
  // 用户状态
  USER_ENABLED: 1,
  USER_DISABLED: 0,
  
  // 服务状态
  SERVICE_RUNNING: 'running',
  SERVICE_STOPPED: 'stopped',
  SERVICE_STARTING: 'starting',
  SERVICE_STOPPING: 'stopping',
  
  // 连接状态
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting'
};

// ── 协议常量 ──────────────────────────────────────────────────
const PROTOCOLS = {
  SOCKS: 'socks',
  HTTP: 'http',
  VLESS: 'vless',
  VMESS: 'vmess',
  TROJAN: 'trojan',
  SHADOWSOCKS: 'shadowsocks'
};

// ── 平台常量 ──────────────────────────────────────────────────
const PLATFORMS = {
  LINUX: 'linux',
  MACOS: 'macos',
  FREEBSD: 'freebsd',
  OPENWRT: 'openwrt',
  WINDOWS: 'windows',
  ALPINE: 'alpine'
};

// ── 导出所有常量 ──────────────────────────────────────────────────
module.exports = {
  PORT,
  TIMEOUT,
  DEFAULTS,
  PATHS,
  REGEX,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STATUS,
  PROTOCOLS,
  PLATFORMS
};