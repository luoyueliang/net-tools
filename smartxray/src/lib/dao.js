/**
 * 数据库访问层 (DAO)
 * 封装所有数据库查询操作，避免重复的 prepare 调用
 */

const { db } = require('./database');

// ==================== 预编译语句缓存 ====================

const statements = {};

/**
 * 获取预编译语句
 * @param {string} sql - SQL 语句
 * @returns {Statement} 预编译语句
 */
function getStatement(sql) {
  if (!statements[sql]) {
    statements[sql] = db().prepare(sql);
  }
  return statements[sql];
}

// ==================== 用户 DAO ====================

/**
 * 用户数据访问对象
 */
const UserDao = {
  /**
   * 根据 ID 获取用户
   * @param {number} id - 用户 ID
   * @returns {Object|null} 用户对象
   */
  getById(id) {
    return getStatement('SELECT * FROM users WHERE id = ?').get(id) || null;
  },

  /**
   * 根据名称获取用户
   * @param {string} name - 用户名称
   * @returns {Object|null} 用户对象
   */
  getByName(name) {
    return getStatement('SELECT * FROM users WHERE name = ?').get(name) || null;
  },

  /**
   * 根据用户名和密码获取用户
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Object|null} 用户对象
   */
  getByCredentials(username, password) {
    return getStatement('SELECT * FROM users WHERE username = ? AND password = ? AND enabled = 1').get(username, password) || null;
  },

  /**
   * 根据 UUID 获取用户
   * @param {string} uuid - 用户 UUID
   * @returns {Object|null} 用户对象
   */
  getByUuid(uuid) {
    return getStatement('SELECT * FROM users WHERE uuid = ?').get(uuid) || null;
  },

  /**
   * 获取所有用户
   * @param {Object} [options] - 查询选项
   * @param {string} [options.orderBy='port'] - 排序字段
   * @param {boolean} [options.enabledOnly=false] - 只返回启用的用户
   * @returns {Array} 用户数组
   */
  getAll(options = {}) {
    const { orderBy = 'port', enabledOnly = false } = options;
    let sql = 'SELECT * FROM users';
    if (enabledOnly) sql += ' WHERE enabled = 1';
    sql += ` ORDER BY ${orderBy}`;
    return getStatement(sql).all();
  },

  /**
   * 获取过期用户
   * @returns {Array} 过期用户数组
   */
  getExpired() {
    const now = new Date().toISOString();
    return getStatement('SELECT * FROM users WHERE expires_at IS NOT NULL AND expires_at < ?').all(now);
  },

  /**
   * 获取没有 UUID 的用户
   * @returns {Array} 用户数组
   */
  getWithoutUuid() {
    return getStatement("SELECT id, uuid FROM users WHERE uuid IS NULL OR uuid = ''").all();
  },

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Object} 创建的用户
   */
  create(userData) {
    const {
      name, port, http_port, uuid, protocol = 'socks',
      username, password, tag, expires_at = null, note = null
    } = userData;

    const result = getStatement(`
      INSERT INTO users (name, port, http_port, uuid, protocol, username, password, tag, expires_at, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, port, http_port, uuid, protocol, username, password, tag, expires_at, note);

    return this.getById(result.lastInsertRowid);
  },

  /**
   * 更新用户
   * @param {number} id - 用户 ID
   * @param {Object} data - 更新数据
   * @returns {Object|null} 更新后的用户
   */
  update(id, data) {
    const allowedFields = ['name', 'port', 'http_port', 'uuid', 'protocol', 'username', 'password', 'tag', 'enabled', 'note', 'expires_at'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    getStatement(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  /**
   * 删除用户
   * @param {number} id - 用户 ID
   * @returns {boolean} 是否删除成功
   */
  delete(id) {
    const result = getStatement('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 为用户分配 UUID
   * @param {number} id - 用户 ID
   * @param {string} uuid - UUID 值
   */
  assignUuid(id, uuid) {
    getStatement('UPDATE users SET uuid = ? WHERE id = ?').run(uuid, id);
  },

  /**
   * 获取用户统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = getStatement('SELECT COUNT(*) as count FROM users').get().count;
    const enabled = getStatement('SELECT COUNT(*) as count FROM users WHERE enabled = 1').get().count;
    const expired = this.getExpired().length;

    return {
      total,
      enabled,
      disabled: total - enabled,
      expired
    };
  },

  /**
   * 检查端口是否已被使用
   * @param {number} port - 端口号
   * @param {number} [excludeId] - 排除的用户 ID
   * @returns {boolean} 端口是否已被使用
   */
  isPortUsed(port, excludeId = null) {
    if (excludeId) {
      return !!getStatement('SELECT 1 FROM users WHERE port = ? AND id != ?').get(port, excludeId);
    }
    return !!getStatement('SELECT 1 FROM users WHERE port = ?').get(port);
  },

  /**
   * 检查 HTTP 端口是否已被使用
   * @param {number} httpPort - HTTP 端口号
   * @param {number} [excludeId] - 排除的用户 ID
   * @returns {boolean} 端口是否已被使用
   */
  isHttpPortUsed(httpPort, excludeId = null) {
    if (excludeId) {
      return !!getStatement('SELECT 1 FROM users WHERE http_port = ? AND id != ?').get(httpPort, excludeId);
    }
    return !!getStatement('SELECT 1 FROM users WHERE http_port = ?').get(httpPort);
  }
};

// ==================== 配置 DAO ====================

/**
 * 配置数据访问对象
 */
const SettingDao = {
  /**
   * 获取配置项
   * @param {string} key - 配置键名
   * @param {string} [defaultValue=''] - 默认值
   * @returns {string} 配置值
   */
  get(key, defaultValue = '') {
    const row = getStatement('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  },

  /**
   * 设置配置项
   * @param {string} key - 配置键名
   * @param {string} value - 配置值
   */
  set(key, value) {
    getStatement('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)').run(key, value);
  },

  /**
   * 批量获取配置
   * @param {string[]} keys - 配置键名数组
   * @returns {Object} 配置对象
   */
  getMultiple(keys) {
    const result = {};
    for (const key of keys) {
      result[key] = this.get(key);
    }
    return result;
  },

  /**
   * 批量设置配置
   * @param {Object} settings - 配置对象 { key: value }
   */
  setMultiple(settings) {
    const stmt = getStatement('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)');
    const transaction = db().transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        stmt.run(key, value);
      }
    });
    transaction(settings);
  },

  /**
   * 删除配置项
   * @param {string} key - 配置键名
   */
  delete(key) {
    getStatement('DELETE FROM settings WHERE key = ?').run(key);
  },

  /**
   * 获取所有配置
   * @returns {Object} 所有配置的键值对
   */
  getAll() {
    const rows = getStatement('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
};

// ==================== 验证码 DAO ====================

/**
 * 验证码数据访问对象
 */
const VerificationDao = {
  /**
   * 创建验证码
   * @param {string} email - 邮箱
   * @param {string} code - 验证码
   * @param {string} expiresAt - 过期时间
   */
  create(email, code, expiresAt) {
    // 清理同邮箱旧验证码
    getStatement('DELETE FROM verifications WHERE email = ? AND used = 0').run(email);
    getStatement('INSERT INTO verifications(email, code, expires_at) VALUES(?, ?, ?)').run(email, code, expiresAt);
  },

  /**
   * 验证验证码
   * @param {string} email - 邮箱
   * @param {string} code - 验证码
   * @returns {Object|null} 验证记录
   */
  verify(email, code) {
    const now = new Date().toISOString();
    const rec = getStatement(
      'SELECT * FROM verifications WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?'
    ).get(email, code, now);
    
    if (rec) {
      getStatement('UPDATE verifications SET used = 1 WHERE id = ?').run(rec.id);
    }
    return rec || null;
  },

  /**
   * 清理过期验证码
   */
  cleanupExpired() {
    const now = new Date().toISOString();
    getStatement('DELETE FROM verifications WHERE expires_at < ?').run(now);
  },

  /**
   * 获取待处理的验证码数量
   * @returns {number} 验证码数量
   */
  getPendingCount() {
    return getStatement('SELECT COUNT(*) as count FROM verifications WHERE used = 0').get().count;
  }
};

module.exports = {
  UserDao,
  SettingDao,
  VerificationDao,
  getStatement
};