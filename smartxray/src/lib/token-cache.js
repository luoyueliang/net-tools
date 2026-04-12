/**
 * Token 缓存模块
 * 优化用户认证效率，避免每次验证都查询数据库
 */

'use strict';

const crypto = require('crypto');

// Token 缓存配置
const TOKEN_CONFIG = {
  ttl: 24 * 60 * 60 * 1000,  // 24 小时
  tokenLength: 32,             // token 长度（字节）
  cleanupInterval: 60 * 60 * 1000  // 清理间隔 1 小时
};

// Token 缓存: token -> { userId, isAdmin, expiresAt, createdAt }
const tokenCache = new Map();

// 用户 ID 到 token 的反向映射（用于用户更新时刷新）
const userTokenMap = new Map();

/**
 * 生成新的 token
 * @returns {string} 随机 token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_CONFIG.tokenLength).toString('hex');
}

/**
 * 创建用户 token
 * @param {number|string} userId - 用户 ID 或 'admin'
 * @param {boolean} isAdmin - 是否管理员
 * @returns {string} 生成的 token
 */
function createToken(userId, isAdmin = false) {
  // 先清除该用户的旧 token
  invalidateUserTokens(userId);
  
  const token = generateToken();
  const now = Date.now();
  
  tokenCache.set(token, {
    userId,
    isAdmin,
    createdAt: now,
    expiresAt: now + TOKEN_CONFIG.ttl
  });
  
  // 记录用户 token 映射
  if (!userTokenMap.has(userId)) {
    userTokenMap.set(userId, new Set());
  }
  userTokenMap.get(userId).add(token);
  
  return token;
}

/**
 * 验证 token 并返回用户信息
 * @param {string} token - 要验证的 token
 * @returns {Object|null} 用户信息或 null
 */
function verifyToken(token) {
  if (!token) return null;
  
  const cached = tokenCache.get(token);
  if (!cached) return null;
  
  // 检查是否过期
  if (Date.now() > cached.expiresAt) {
    tokenCache.delete(token);
    // 从用户映射中移除
    const userTokens = userTokenMap.get(cached.userId);
    if (userTokens) {
      userTokens.delete(token);
      if (userTokens.size === 0) {
        userTokenMap.delete(cached.userId);
      }
    }
    return null;
  }
  
  return {
    userId: cached.userId,
    isAdmin: cached.isAdmin,
    createdAt: cached.createdAt,
    expiresAt: cached.expiresAt
  };
}

/**
 * 使指定用户的所有 token 失效
 * @param {number|string} userId - 用户 ID
 */
function invalidateUserTokens(userId) {
  const userTokens = userTokenMap.get(userId);
  if (userTokens) {
    for (const token of userTokens) {
      tokenCache.delete(token);
    }
    userTokenMap.delete(userId);
  }
}

/**
 * 刷新 token 过期时间
 * @param {string} token - 要刷新的 token
 * @returns {boolean} 是否刷新成功
 */
function refreshToken(token) {
  const cached = tokenCache.get(token);
  if (!cached) return false;
  
  if (Date.now() > cached.expiresAt) {
    tokenCache.delete(token);
    return false;
  }
  
  cached.expiresAt = Date.now() + TOKEN_CONFIG.ttl;
  return true;
}

/**
 * 删除指定 token
 * @param {string} token - 要删除的 token
 */
function deleteToken(token) {
  const cached = tokenCache.get(token);
  if (cached) {
    tokenCache.delete(token);
    const userTokens = userTokenMap.get(cached.userId);
    if (userTokens) {
      userTokens.delete(token);
      if (userTokens.size === 0) {
        userTokenMap.delete(cached.userId);
      }
    }
  }
}

/**
 * 清理过期的 token
 * @returns {number} 清理的数量
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, cached] of tokenCache.entries()) {
    if (now > cached.expiresAt) {
      tokenCache.delete(token);
      const userTokens = userTokenMap.get(cached.userId);
      if (userTokens) {
        userTokens.delete(token);
        if (userTokens.size === 0) {
          userTokenMap.delete(cached.userId);
        }
      }
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * 获取缓存统计信息
 * @returns {Object} 统计信息
 */
function getCacheStats() {
  return {
    totalTokens: tokenCache.size,
    totalUsers: userTokenMap.size,
    config: TOKEN_CONFIG
  };
}

/**
 * 启动定期清理任务
 * @returns {NodeJS.Timer} 定时器
 */
function startCleanupTimer() {
  return setInterval(() => {
    const cleaned = cleanupExpiredTokens();
    if (cleaned > 0) {
      console.log(`[TokenCache] 清理了 ${cleaned} 个过期 token`);
    }
  }, TOKEN_CONFIG.cleanupInterval);
}

module.exports = {
  generateToken,
  createToken,
  verifyToken,
  invalidateUserTokens,
  refreshToken,
  deleteToken,
  cleanupExpiredTokens,
  getCacheStats,
  startCleanupTimer,
  TOKEN_CONFIG
};