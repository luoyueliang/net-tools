/**
 * 错误处理模块
 * 提供统一的错误处理机制和错误类型定义
 */

// ==================== 错误码常量 ====================

/**
 * 错误码定义
 */
const ErrorCodes = {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR: { code: 1000, message: '未知错误' },
  INVALID_INPUT: { code: 1001, message: '输入参数无效' },
  MISSING_REQUIRED_FIELD: { code: 1002, message: '缺少必填字段' },
  JSON_PARSE_ERROR: { code: 1003, message: 'JSON 解析失败' },
  INTERNAL_SERVER_ERROR: { code: 1004, message: '服务器内部错误' },
  NOT_FOUND: { code: 1005, message: '资源不存在' },
  METHOD_NOT_ALLOWED: { code: 1006, message: '请求方法不允许' },

  // 认证错误 (2xxx)
  AUTH_REQUIRED: { code: 2000, message: '需要认证' },
  INVALID_TOKEN: { code: 2001, message: '无效的 token' },
  TOKEN_EXPIRED: { code: 2002, message: 'token 已过期' },
  INVALID_CREDENTIALS: { code: 2003, message: '用户名或密码错误' },
  ACCESS_DENIED: { code: 2004, message: '访问被拒绝' },

  // 用户错误 (3xxx)
  USER_NOT_FOUND: { code: 3000, message: '用户不存在' },
  USER_ALREADY_EXISTS: { code: 3001, message: '用户已存在' },
  USER_DISABLED: { code: 3002, message: '用户已禁用' },
  USER_EXPIRED: { code: 3003, message: '用户已过期' },
  INVALID_PORT: { code: 3004, message: '端口无效' },
  PORT_ALREADY_USED: { code: 3005, message: '端口已被使用' },
  INVALID_USERNAME: { code: 3006, message: '用户名无效' },
  INVALID_PASSWORD: { code: 3007, message: '密码无效' },

  // 配置错误 (4xxx)
  CONFIG_NOT_FOUND: { code: 4000, message: '配置不存在' },
  CONFIG_INVALID: { code: 4001, message: '配置无效' },
  CONFIG_SAVE_FAILED: { code: 4002, message: '配置保存失败' },

  // 验证码错误 (5xxx)
  VERIFICATION_CODE_INVALID: { code: 5000, message: '验证码无效' },
  VERIFICATION_CODE_EXPIRED: { code: 5001, message: '验证码已过期' },
  VERIFICATION_CODE_USED: { code: 5002, message: '验证码已使用' },
  EMAIL_INVALID: { code: 5003, message: '邮箱无效' },
  SEND_EMAIL_FAILED: { code: 5004, message: '发送邮件失败' },

  // 防火墙错误 (6xxx)
  FIREWALL_OPERATION_FAILED: { code: 6000, message: '防火墙操作失败' },
  UNSUPPORTED_PLATFORM: { code: 6001, message: '不支持的平台' },

  // Reality 错误 (7xxx)
  REALITY_NOT_ENABLED: { code: 7000, message: 'Reality 未启用' },
  REALITY_KEY_GENERATION_FAILED: { code: 7001, message: 'Reality 密钥生成失败' }
};

// ==================== 自定义错误类 ====================

/**
 * 应用错误基类
 */
class AppError extends Error {
  /**
   * 创建应用错误
   * @param {Object} errorDef - 错误定义对象
   * @param {string} [details] - 错误详情
   * @param {Error} [originalError] - 原始错误
   */
  constructor(errorDef, details = '', originalError = null) {
    super(errorDef.message);
    this.name = 'AppError';
    this.code = errorDef.code;
    this.message = errorDef.message;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 转换为 JSON 对象
   * @returns {Object} JSON 对象
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details || undefined,
      timestamp: this.timestamp
    };
  }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
  /**
   * 创建验证错误
   * @param {string} field - 字段名
   * @param {string} message - 错误消息
   * @param {*} value - 无效的值
   */
  constructor(field, message, value = undefined) {
    super(ErrorCodes.INVALID_INPUT, `${field}: ${message}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 认证错误类
 */
class AuthError extends AppError {
  /**
   * 创建认证错误
   * @param {Object} errorDef - 错误定义
   * @param {string} [details] - 错误详情
   */
  constructor(errorDef = ErrorCodes.AUTH_REQUIRED, details = '') {
    super(errorDef, details);
    this.name = 'AuthError';
  }
}

/**
 * 数据库错误类
 */
class DatabaseError extends AppError {
  /**
   * 创建数据库错误
   * @param {string} operation - 操作名称
   * @param {Error} originalError - 原始错误
   */
  constructor(operation, originalError) {
    super(ErrorCodes.INTERNAL_SERVER_ERROR, `数据库操作失败: ${operation}`);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

// ==================== 错误处理函数 ====================

/**
 * 处理错误并发送响应
 * @param {Error} err - 错误对象
 * @param {Object} res - HTTP 响应对象
 */
function handleError(err, res) {
  // 记录错误日志
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    code: err.code,
    details: err.details,
    stack: err.stack
  });

  // 确定 HTTP 状态码
  let statusCode = 500;
  if (err instanceof AppError) {
    if (err.code >= 2000 && err.code < 3000) {
      statusCode = 401;
    } else if (err.code === ErrorCodes.NOT_FOUND.code) {
      statusCode = 404;
    } else if (err.code === ErrorCodes.INVALID_INPUT.code || err.code === ErrorCodes.MISSING_REQUIRED_FIELD.code) {
      statusCode = 400;
    } else if (err.code === ErrorCodes.ACCESS_DENIED.code) {
      statusCode = 403;
    }
  }

  // 发送错误响应
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });

  const responseBody = err instanceof AppError 
    ? err.toJSON() 
    : { error: '服务器内部错误', code: ErrorCodes.INTERNAL_SERVER_ERROR.code };

  res.end(JSON.stringify(responseBody));
}

/**
 * 异步错误包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return (req, res, ...args) => {
    Promise.resolve(fn(req, res, ...args)).catch(err => handleError(err, res));
  };
}

/**
 * 创建错误响应
 * @param {Object} errorDef - 错误定义
 * @param {string} [details] - 错误详情
 * @returns {Object} 错误响应对象
 */
function createErrorResponse(errorDef, details = '') {
  return {
    error: errorDef.message,
    code: errorDef.code,
    details: details || undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {string} [message] - 成功消息
 * @returns {Object} 成功响应对象
 */
function createSuccessResponse(data, message = '操作成功') {
  return {
    ok: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  ErrorCodes,
  AppError,
  ValidationError,
  AuthError,
  DatabaseError,
  handleError,
  asyncHandler,
  createErrorResponse,
  createSuccessResponse
};