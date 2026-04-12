/**
 * 分级日志系统模块
 * 支持多级别日志、文件轮转、结构化日志
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { PATHS, DEFAULTS } = require('./constants');

// 日志级别定义（从低到高）
const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5
};

// 日志级别颜色（用于控制台输出）
const LEVEL_COLORS = {
  trace: '\x1b[90m',  // 灰色
  debug: '\x1b[36m',  // 青色
  info: '\x1b[32m',   // 绿色
  warn: '\x1b[33m',   // 黄色
  error: '\x1b[31m',  // 红色
  fatal: '\x1b[35m'   // 紫色
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(options = {}) {
    this.level = options.level || DEFAULTS.LOG_LEVEL;
    this.logDir = options.logDir || path.dirname(PATHS.LOG_FILE);
    this.logFile = options.logFile || PATHS.LOG_FILE;
    this.maxSize = options.maxSize || DEFAULTS.LOG_MAX_SIZE;
    this.maxFiles = options.maxFiles || DEFAULTS.LOG_MAX_FILES;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.enableJson = options.enableJson || false;
    
    // 确保日志目录存在
    if (this.enableFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   * @param {string} level - 日志级别
   * @returns {boolean}
   */
  shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * 格式化时间戳
   * @returns {string}
   */
  formatTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   * @returns {string}
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.formatTimestamp();
    
    if (this.enableJson) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    }
    
    const metaStr = Object.keys(meta).length > 0 
      ? ` ${JSON.stringify(meta)}`
      : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * 写入控制台
   * @param {string} level - 日志级别
   * @param {string} formatted - 格式化后的消息
   */
  writeToConsole(level, formatted) {
    if (!this.enableConsole) return;
    
    const color = LEVEL_COLORS[level] || '';
    const output = `${color}${formatted}${RESET_COLOR}`;
    
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  /**
   * 写入文件
   * @param {string} formatted - 格式化后的消息
   */
  writeToFile(formatted) {
    if (!this.enableFile) return;
    
    try {
      // 检查是否需要轮转
      this.rotateIfNeeded();
      
      // 追加日志
      fs.appendFileSync(this.logFile, formatted + '\n');
    } catch (err) {
      process.stderr.write(`[Logger] 写入日志文件失败: ${err.message}\n`);
    }
  }

  /**
   * 日志文件轮转
   */
  rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.logFile)) return;
      
      const stats = fs.statSync(this.logFile);
      if (stats.size < this.maxSize) return;
      
      // 轮转现有文件
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // 当前日志文件重命名为 .1
      fs.renameSync(this.logFile, `${this.logFile}.1`);
    } catch (err) {
      process.stderr.write(`[Logger] 日志轮转失败: ${err.message}\n`);
    }
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, meta);
    
    this.writeToConsole(level, formatted);
    this.writeToFile(formatted);
  }

  /**
   * 记录 trace 级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  trace(message, meta) {
    this.log('trace', message, meta);
  }

  /**
   * 记录 debug 级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  debug(message, meta) {
    this.log('debug', message, meta);
  }

  /**
   * 记录 info 级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  info(message, meta) {
    this.log('info', message, meta);
  }

  /**
   * 记录 warn 级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  warn(message, meta) {
    this.log('warn', message, meta);
  }

  /**
   * 记录 error 级别日志
   * @param {string} message - 日志消息
   * @param {Error|Object} [error] - 错误对象或元数据
   */
  error(message, error) {
    const meta = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error;
    this.log('error', message, meta);
  }

  /**
   * 记录 fatal 级别日志
   * @param {string} message - 日志消息
   * @param {Error|Object} [error] - 错误对象或元数据
   */
  fatal(message, error) {
    const meta = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error;
    this.log('fatal', message, meta);
  }

  /**
   * 创建子日志器（继承父日志器配置，添加固定元数据）
   * @param {Object} meta - 固定元数据
   * @returns {Logger}
   */
  child(meta = {}) {
    const childLogger = new Logger({
      level: this.level,
      logDir: this.logDir,
      logFile: this.logFile,
      maxSize: this.maxSize,
      maxFiles: this.maxFiles,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      enableJson: this.enableJson
    });
    
    // 重写 log 方法，添加固定元数据
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, additionalMeta = {}) => {
      originalLog(level, message, { ...meta, ...additionalMeta });
    };
    
    return childLogger;
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.level = level;
    }
  }

  /**
   * 获取当前日志级别
   * @returns {string}
   */
  getLevel() {
    return this.level;
  }

  /**
   * 清理旧日志文件
   * @param {number} days - 保留天数
   */
  cleanupOldLogs(days = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = days * 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        if (!file.startsWith(path.basename(this.logFile))) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          this.debug(`清理旧日志文件: ${file}`);
        }
      }
    } catch (err) {
      this.error('清理旧日志文件失败', err);
    }
  }
}

// 默认日志器实例
const defaultLogger = new Logger();

// 导出
module.exports = {
  Logger,
  LOG_LEVELS,
  logger: defaultLogger,
  
  // 便捷方法
  trace: (msg, meta) => defaultLogger.trace(msg, meta),
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  warn: (msg, meta) => defaultLogger.warn(msg, meta),
  error: (msg, err) => defaultLogger.error(msg, err),
  fatal: (msg, err) => defaultLogger.fatal(msg, err),
  
  // 创建子日志器
  child: (meta) => defaultLogger.child(meta),
  
  // 设置级别
  setLevel: (level) => defaultLogger.setLevel(level),
  getLevel: () => defaultLogger.getLevel()
};