/**
 * 输入验证模块
 * 为 API 端点提供参数验证功能
 */

// ==================== 验证函数 ====================

/**
 * 验证器对象
 */
const Validators = {
  /**
   * 检查值是否为空
   * @param {*} value - 要检查的值
   * @returns {boolean} 是否为空
   */
  isEmpty(value) {
    return value === undefined || value === null || value === '';
  },

  /**
   * 检查值是否为非空字符串
   * @param {*} value - 要检查的值
   * @returns {boolean} 是否为非空字符串
   */
  isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  },

  /**
   * 验证用户名
   * @param {string} username - 用户名
   * @returns {Object} 验证结果 { valid: boolean, message: string }
   */
  isValidUsername(username) {
    if (!this.isNonEmptyString(username)) {
      return { valid: false, message: '用户名不能为空' };
    }
    if (username.length < 3) {
      return { valid: false, message: '用户名至少需要 3 个字符' };
    }
    if (username.length > 50) {
      return { valid: false, message: '用户名不能超过 50 个字符' };
    }
    // 只允许字母、数字、下划线和连字符
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, message: '用户名只能包含字母、数字、下划线和连字符' };
    }
    return { valid: true };
  },

  /**
   * 验证密码
   * @param {string} password - 密码
   * @returns {Object} 验证结果
   */
  isValidPassword(password) {
    if (!this.isNonEmptyString(password)) {
      return { valid: false, message: '密码不能为空' };
    }
    if (password.length < 6) {
      return { valid: false, message: '密码至少需要 6 个字符' };
    }
    if (password.length > 100) {
      return { valid: false, message: '密码不能超过 100 个字符' };
    }
    return { valid: true };
  },

  /**
   * 验证端口号
   * @param {*} port - 端口号
   * @returns {Object} 验证结果
   */
  isValidPort(port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum)) {
      return { valid: false, message: '端口必须是数字' };
    }
    if (portNum < 1 || portNum > 65535) {
      return { valid: false, message: '端口必须在 1-65535 范围内' };
    }
    return { valid: true, value: portNum };
  },

  /**
   * 验证邮箱地址
   * @param {string} email - 邮箱地址
   * @returns {Object} 验证结果
   */
  isValidEmail(email) {
    if (!this.isNonEmptyString(email)) {
      return { valid: false, message: '邮箱不能为空' };
    }
    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: '邮箱格式无效' };
    }
    if (email.length > 254) {
      return { valid: false, message: '邮箱地址过长' };
    }
    return { valid: true };
  },

  /**
   * 验证 UUID
   * @param {string} uuid - UUID 字符串
   * @returns {Object} 验证结果
   */
  isValidUUID(uuid) {
    if (!this.isNonEmptyString(uuid)) {
      return { valid: false, message: 'UUID 不能为空' };
    }
    // UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      return { valid: false, message: 'UUID 格式无效' };
    }
    return { valid: true };
  },

  /**
   * 验证 IP 地址
   * @param {string} ip - IP 地址
   * @returns {Object} 验证结果
   */
  isValidIP(ip) {
    if (!this.isNonEmptyString(ip)) {
      return { valid: false, message: 'IP 地址不能为空' };
    }
    // IPv4 格式
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) {
          return { valid: false, message: 'IPv4 地址无效' };
        }
      }
      return { valid: true };
    }
    // IPv6 格式（简化验证）
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return { valid: true };
    }
    return { valid: false, message: 'IP 地址格式无效' };
  },

  /**
   * 验证日期字符串
   * @param {string} dateStr - 日期字符串
   * @returns {Object} 验证结果
   */
  isValidDate(dateStr) {
    if (!this.isNonEmptyString(dateStr)) {
      return { valid: false, message: '日期不能为空' };
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { valid: false, message: '日期格式无效' };
    }
    return { valid: true, value: date.toISOString() };
  },

  /**
   * 验证布尔值
   * @param {*} value - 要验证的值
   * @returns {Object} 验证结果
   */
  isValidBoolean(value) {
    if (typeof value === 'boolean') {
      return { valid: true, value };
    }
    if (value === 'true' || value === '1') {
      return { valid: true, value: true };
    }
    if (value === 'false' || value === '0') {
      return { valid: true, value: false };
    }
    return { valid: false, message: '值必须是布尔类型' };
  },

  /**
   * 验证字符串长度
   * @param {string} str - 字符串
   * @param {number} min - 最小长度
   * @param {number} max - 最大长度
   * @returns {Object} 验证结果
   */
  isValidLength(str, min, max) {
    if (typeof str !== 'string') {
      return { valid: false, message: '值必须是字符串' };
    }
    if (str.length < min) {
      return { valid: false, message: `长度不能小于 ${min} 个字符` };
    }
    if (str.length > max) {
      return { valid: false, message: `长度不能超过 ${max} 个字符` };
    }
    return { valid: true };
  },

  /**
   * 验证数值范围
   * @param {*} value - 数值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {Object} 验证结果
   */
  isInRange(value, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, message: '值必须是数字' };
    }
    if (num < min || num > max) {
      return { valid: false, message: `值必须在 ${min} 到 ${max} 范围内` };
    }
    return { valid: true, value: num };
  }
};

// ==================== 验证中间件 ====================

/**
 * 创建验证中间件
 * @param {Object} rules - 验证规则
 * @returns {Function} 中间件函数
 */
function createValidator(rules) {
  return (data) => {
    const errors = [];
    const validated = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field];

      for (const rule of fieldRules) {
        const result = rule(value, field);
        if (!result.valid) {
          errors.push({ field, message: result.message });
          break;
        }
        if (result.value !== undefined) {
          validated[field] = result.value;
        } else {
          validated[field] = value;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: validated
    };
  };
}

// ==================== 常用验证规则 ====================

/**
 * 必填规则
 */
function required(value, field) {
  if (Validators.isEmpty(value)) {
    return { valid: false, message: `${field} 是必填项` };
  }
  return { valid: true };
}

/**
 * 用户名规则
 */
function username(value) {
  return Validators.isValidUsername(value);
}

/**
 * 密码规则
 */
function password(value) {
  return Validators.isValidPassword(value);
}

/**
 * 端口规则
 */
function port(value) {
  return Validators.isValidPort(value);
}

/**
 * 邮箱规则
 */
function email(value) {
  return Validators.isValidEmail(value);
}

/**
 * UUID 规则
 */
function uuid(value) {
  return Validators.isValidUUID(value);
}

module.exports = {
  Validators,
  createValidator,
  required,
  username,
  password,
  port,
  email,
  uuid
};