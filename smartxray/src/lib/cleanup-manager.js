/**
 * 清理管理器模块
 * 统一管理所有定时清理任务，优化清理逻辑
 */

'use strict';

const { db } = require('./database');
const { getSetting } = require('./config-cache');

// 清理配置
const CLEANUP_CONFIG = {
  // 过期用户清理
  expiredUsers: {
    enabled: true,
    interval: 60 * 60 * 1000,  // 1 小时
    batchSize: 100,             // 批量删除大小
    lastRun: null,
    stats: { total: 0, lastCleaned: 0 }
  },
  // 验证码清理
  verifications: {
    enabled: true,
    interval: 30 * 60 * 1000,  // 30 分钟
    batchSize: 500,
    lastRun: null,
    stats: { total: 0, lastCleaned: 0 }
  },
  // Token 缓存清理（由 token-cache 模块管理）
  tokenCache: {
    enabled: true,
    interval: 60 * 60 * 1000,  // 1 小时
    lastRun: null,
    stats: { total: 0, lastCleaned: 0 }
  }
};

// 定时器集合
const timers = new Map();

/**
 * 清理过期用户（分批处理）
 * @returns {Object} 清理统计
 */
function cleanupExpiredUsers() {
  const config = CLEANUP_CONFIG.expiredUsers;
  if (!config.enabled) return { cleaned: 0, batches: 0 };

  const now = new Date().toISOString();
  let totalCleaned = 0;
  let batches = 0;

  try {
    // 分批查询和删除
    while (true) {
      const expired = db().prepare(`
        SELECT id FROM users 
        WHERE expires_at IS NOT NULL AND expires_at < ? 
        LIMIT ?
      `).all(now, config.batchSize);

      if (expired.length === 0) break;

      const ids = expired.map(u => u.id);
      const placeholders = ids.map(() => '?').join(',');
      
      const result = db().prepare(`
        DELETE FROM users WHERE id IN (${placeholders})
      `).run(...ids);

      totalCleaned += result.changes;
      batches++;

      // 如果这批数量小于 batchSize，说明已经处理完
      if (expired.length < config.batchSize) break;
    }

    // 更新统计
    config.stats.total += totalCleaned;
    config.stats.lastCleaned = totalCleaned;
    config.lastRun = new Date();

    if (totalCleaned > 0) {
      console.log(`[Cleanup] 清理了 ${totalCleaned} 个过期用户 (${batches} 批)`);
    }

    return { cleaned: totalCleaned, batches };
  } catch (err) {
    console.error('[Cleanup] 清理过期用户失败:', err.message);
    return { cleaned: 0, batches: 0, error: err.message };
  }
}

/**
 * 清理过期验证码（分批处理）
 * @returns {Object} 清理统计
 */
function cleanupExpiredVerifications() {
  const config = CLEANUP_CONFIG.verifications;
  if (!config.enabled) return { cleaned: 0, batches: 0 };

  const now = new Date().toISOString();
  let totalCleaned = 0;
  let batches = 0;

  try {
    while (true) {
      const result = db().prepare(`
        DELETE FROM verifications 
        WHERE expires_at < ? 
        LIMIT ?
      `).run(now, config.batchSize);

      if (result.changes === 0) break;

      totalCleaned += result.changes;
      batches++;

      if (result.changes < config.batchSize) break;
    }

    // 更新统计
    config.stats.total += totalCleaned;
    config.stats.lastCleaned = totalCleaned;
    config.lastRun = new Date();

    if (totalCleaned > 0) {
      console.log(`[Cleanup] 清理了 ${totalCleaned} 个过期验证码 (${batches} 批)`);
    }

    return { cleaned: totalCleaned, batches };
  } catch (err) {
    console.error('[Cleanup] 清理过期验证码失败:', err.message);
    return { cleaned: 0, batches: 0, error: err.message };
  }
}

/**
 * 执行所有清理任务
 * @returns {Object} 所有任务的清理统计
 */
function runAllCleanups() {
  const results = {
    timestamp: new Date().toISOString(),
    expiredUsers: cleanupExpiredUsers(),
    verifications: cleanupExpiredVerifications()
  };

  return results;
}

/**
 * 启动单个清理定时器
 * @param {string} name - 任务名称
 * @param {Function} fn - 清理函数
 * @param {number} interval - 间隔时间（毫秒）
 */
function startTimer(name, fn, interval) {
  if (timers.has(name)) {
    clearInterval(timers.get(name));
  }

  const timer = setInterval(() => {
    try {
      fn();
    } catch (err) {
      console.error(`[Cleanup] ${name} 执行失败:`, err.message);
    }
  }, interval);

  timers.set(name, timer);
  console.log(`[Cleanup] 启动定时任务: ${name} (间隔 ${interval / 1000}s)`);
}

/**
 * 停止单个清理定时器
 * @param {string} name - 任务名称
 */
function stopTimer(name) {
  if (timers.has(name)) {
    clearInterval(timers.get(name));
    timers.delete(name);
    console.log(`[Cleanup] 停止定时任务: ${name}`);
  }
}

/**
 * 启动所有清理定时器
 */
function startAllTimers() {
  const { expiredUsers, verifications } = CLEANUP_CONFIG;

  if (expiredUsers.enabled) {
    startTimer('expiredUsers', cleanupExpiredUsers, expiredUsers.interval);
  }

  if (verifications.enabled) {
    startTimer('verifications', cleanupExpiredVerifications, verifications.interval);
  }
}

/**
 * 停止所有清理定时器
 */
function stopAllTimers() {
  for (const name of timers.keys()) {
    stopTimer(name);
  }
}

/**
 * 获取清理统计信息
 * @returns {Object} 统计信息
 */
function getCleanupStats() {
  return {
    config: CLEANUP_CONFIG,
    activeTimers: Array.from(timers.keys()),
    timerCount: timers.size
  };
}

/**
 * 更新清理配置
 * @param {string} taskName - 任务名称
 * @param {Object} options - 配置选项
 */
function updateConfig(taskName, options = {}) {
  const config = CLEANUP_CONFIG[taskName];
  if (!config) {
    throw new Error(`未知的清理任务: ${taskName}`);
  }

  if (options.enabled !== undefined) {
    config.enabled = options.enabled;
  }
  if (options.interval !== undefined) {
    config.interval = options.interval;
    // 如果定时器正在运行，重启它
    if (timers.has(taskName) && config.enabled) {
      stopTimer(taskName);
      startTimer(taskName, 
        taskName === 'expiredUsers' ? cleanupExpiredUsers : cleanupExpiredVerifications,
        config.interval
      );
    }
  }
  if (options.batchSize !== undefined) {
    config.batchSize = options.batchSize;
  }
}

module.exports = {
  cleanupExpiredUsers,
  cleanupExpiredVerifications,
  runAllCleanups,
  startTimer,
  stopTimer,
  startAllTimers,
  stopAllTimers,
  getCleanupStats,
  updateConfig,
  CLEANUP_CONFIG
};