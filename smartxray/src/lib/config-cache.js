/**
 * 配置缓存模块
 * 减少 getSetting() 的数据库查询次数
 */

const { SettingDao } = require('./dao');

// ==================== 缓存实现 ====================

/**
 * 配置缓存对象
 */
const cache = {
  data: {},
  loaded: false,
  lastUpdate: null
};

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 缓存过期时间（毫秒）
  ttl: 60000, // 1 分钟
  // 是否自动刷新
  autoRefresh: true
};

// ==================== 缓存操作函数 ====================

/**
 * 加载所有配置到缓存
 */
function loadCache() {
  try {
    cache.data = SettingDao.getAll();
    cache.loaded = true;
    cache.lastUpdate = new Date();
    console.log('[ConfigCache] 配置缓存已加载');
  } catch (err) {
    console.error('[ConfigCache] 加载缓存失败:', err.message);
  }
}

/**
 * 检查缓存是否过期
 * @returns {boolean} 是否过期
 */
function isCacheExpired() {
  if (!cache.lastUpdate) return true;
  const now = new Date();
  return (now - cache.lastUpdate) > CACHE_CONFIG.ttl;
}

/**
 * 获取配置项（优先从缓存读取）
 * @param {string} key - 配置键名
 * @param {string} [defaultValue=''] - 默认值
 * @returns {string} 配置值
 */
function getCachedSetting(key, defaultValue = '') {
  // 如果缓存未加载或已过期，重新加载
  if (!cache.loaded || isCacheExpired()) {
    loadCache();
  }
  
  return cache.data[key] !== undefined ? cache.data[key] : defaultValue;
}

/**
 * 设置配置项（同时更新缓存）
 * @param {string} key - 配置键名
 * @param {string} value - 配置值
 */
function setCachedSetting(key, value) {
  // 更新数据库
  SettingDao.set(key, value);
  
  // 更新缓存
  cache.data[key] = value;
  cache.lastUpdate = new Date();
}

/**
 * 批量获取配置（优先从缓存读取）
 * @param {string[]} keys - 配置键名数组
 * @returns {Object} 配置对象
 */
function getCachedSettings(keys) {
  // 如果缓存未加载或已过期，重新加载
  if (!cache.loaded || isCacheExpired()) {
    loadCache();
  }
  
  const result = {};
  for (const key of keys) {
    result[key] = cache.data[key] !== undefined ? cache.data[key] : '';
  }
  return result;
}

/**
 * 批量设置配置（同时更新缓存）
 * @param {Object} settings - 配置对象 { key: value }
 */
function setCachedSettings(settings) {
  // 更新数据库
  SettingDao.setMultiple(settings);
  
  // 更新缓存
  for (const [key, value] of Object.entries(settings)) {
    cache.data[key] = value;
  }
  cache.lastUpdate = new Date();
}

/**
 * 删除配置项（同时删除缓存）
 * @param {string} key - 配置键名
 */
function deleteCachedSetting(key) {
  // 删除数据库记录
  SettingDao.delete(key);
  
  // 删除缓存
  delete cache.data[key];
  cache.lastUpdate = new Date();
}

/**
 * 获取所有配置（优先从缓存读取）
 * @returns {Object} 所有配置的键值对
 */
function getAllCachedSettings() {
  // 如果缓存未加载或已过期，重新加载
  if (!cache.loaded || isCacheExpired()) {
    loadCache();
  }
  
  return { ...cache.data };
}

/**
 * 强制刷新缓存
 */
function refreshCache() {
  loadCache();
}

/**
 * 清空缓存
 */
function clearCache() {
  cache.data = {};
  cache.loaded = false;
  cache.lastUpdate = null;
  console.log('[ConfigCache] 配置缓存已清空');
}

/**
 * 获取缓存状态
 * @returns {Object} 缓存状态信息
 */
function getCacheStatus() {
  return {
    loaded: cache.loaded,
    lastUpdate: cache.lastUpdate,
    expired: isCacheExpired(),
    keyCount: Object.keys(cache.data).length
  };
}

// ==================== 初始化 ====================

// 启动时加载缓存
loadCache();

// 定时刷新缓存
if (CACHE_CONFIG.autoRefresh) {
  setInterval(() => {
    if (isCacheExpired()) {
      loadCache();
    }
  }, CACHE_CONFIG.ttl);
}

module.exports = {
  getCachedSetting,
  setCachedSetting,
  getCachedSettings,
  setCachedSettings,
  deleteCachedSetting,
  getAllCachedSettings,
  refreshCache,
  clearCache,
  getCacheStatus,
  loadCache
};