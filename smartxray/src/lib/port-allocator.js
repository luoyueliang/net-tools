/**
 * 端口分配器模块
 * 使用位图算法优化端口分配性能
 */

'use strict';

const { db } = require('./database');

// 端口范围配置
const PORT_RANGES = {
  socks: { start: 10000, end: 19999 },
  http: { start: 20000, end: 29999 },
  fixed: { start: 30000, end: 39999 }
};

// 端口位图（每个位表示一个端口是否被占用）
class PortBitmap {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.size = end - start + 1;
    // 使用 Uint32Array 存储位图，每个元素 32 位
    this.bitmap = new Uint32Array(Math.ceil(this.size / 32));
  }

  /**
   * 将端口号转换为位图索引
   * @param {number} port - 端口号
   * @returns {number} 位图索引
   */
  portToIndex(port) {
    return port - this.start;
  }

  /**
   * 检查端口是否被占用
   * @param {number} port - 端口号
   * @returns {boolean} 是否被占用
   */
  isOccupied(port) {
    const index = this.portToIndex(port);
    const arrayIndex = Math.floor(index / 32);
    const bitIndex = index % 32;
    return (this.bitmap[arrayIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * 标记端口为已占用
   * @param {number} port - 端口号
   */
  markOccupied(port) {
    const index = this.portToIndex(port);
    const arrayIndex = Math.floor(index / 32);
    const bitIndex = index % 32;
    this.bitmap[arrayIndex] |= (1 << bitIndex);
  }

  /**
   * 标记端口为可用
   * @param {number} port - 端口号
   */
  markAvailable(port) {
    const index = this.portToIndex(port);
    const arrayIndex = Math.floor(index / 32);
    const bitIndex = index % 32;
    this.bitmap[arrayIndex] &= ~(1 << bitIndex);
  }

  /**
   * 查找第一个可用端口
   * @returns {number|null} 可用端口号或 null
   */
  findFirstAvailable() {
    for (let i = 0; i < this.bitmap.length; i++) {
      if (this.bitmap[i] !== 0xFFFFFFFF) {
        // 找到第一个有空闲位的数组元素
        const bits = this.bitmap[i];
        for (let j = 0; j < 32; j++) {
          if ((bits & (1 << j)) === 0) {
            const port = this.start + i * 32 + j;
            if (port <= this.end) {
              return port;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 获取已占用端口数量
   * @returns {number} 已占用端口数量
   */
  getOccupiedCount() {
    let count = 0;
    for (let i = 0; i < this.bitmap.length; i++) {
      let bits = this.bitmap[i];
      // 数 1 的个数（Brian Kernighan 算法）
      while (bits) {
        bits &= bits - 1;
        count++;
      }
    }
    return count;
  }

  /**
   * 获取可用端口数量
   * @returns {number} 可用端口数量
   */
  getAvailableCount() {
    return this.size - this.getOccupiedCount();
  }

  /**
   * 清空位图
   */
  clear() {
    this.bitmap.fill(0);
  }
}

// 端口分配器
class PortAllocator {
  constructor() {
    this.bitmaps = {
      socks: new PortBitmap(PORT_RANGES.socks.start, PORT_RANGES.socks.end),
      http: new PortBitmap(PORT_RANGES.http.start, PORT_RANGES.http.end),
      fixed: new PortBitmap(PORT_RANGES.fixed.start, PORT_RANGES.fixed.end)
    };
    this.initialized = false;
  }

  /**
   * 从数据库加载已使用的端口
   */
  loadFromDatabase() {
    if (this.initialized) return;

    try {
      // 加载用户端口
      const users = db().prepare('SELECT port, http_port FROM users').all();
      for (const user of users) {
        if (user.port) {
          this.bitmaps.socks.markOccupied(user.port);
        }
        if (user.http_port) {
          this.bitmaps.http.markOccupied(user.http_port);
        }
      }

      // 加载固定端口
      const fixedPorts = db().prepare('SELECT port FROM fixed_ports').all();
      for (const fp of fixedPorts) {
        this.bitmaps.fixed.markOccupied(fp.port);
      }

      this.initialized = true;
      console.log('[PortAllocator] 端口位图初始化完成');
    } catch (err) {
      console.error('[PortAllocator] 加载端口数据失败:', err.message);
    }
  }

  /**
   * 分配端口
   * @param {string} type - 端口类型 ('socks', 'http', 'fixed')
   * @param {number} [preferred] - 首选端口（可选）
   * @returns {number|null} 分配的端口号或 null
   */
  allocate(type = 'socks', preferred = null) {
    this.loadFromDatabase();

    const bitmap = this.bitmaps[type];
    if (!bitmap) {
      console.error(`[PortAllocator] 未知的端口类型: ${type}`);
      return null;
    }

    // 如果指定了首选端口且可用，使用它
    if (preferred && !bitmap.isOccupied(preferred)) {
      bitmap.markOccupied(preferred);
      return preferred;
    }

    // 查找第一个可用端口
    const port = bitmap.findFirstAvailable();
    if (port) {
      bitmap.markOccupied(port);
    }

    return port;
  }

  /**
   * 释放端口
   * @param {number} port - 端口号
   * @param {string} type - 端口类型
   */
  release(port, type = 'socks') {
    const bitmap = this.bitmaps[type];
    if (bitmap) {
      bitmap.markAvailable(port);
    }
  }

  /**
   * 检查端口是否可用
   * @param {number} port - 端口号
   * @param {string} type - 端口类型
   * @returns {boolean} 是否可用
   */
  isAvailable(port, type = 'socks') {
    this.loadFromDatabase();

    const bitmap = this.bitmaps[type];
    if (!bitmap) return false;

    // 检查是否在范围内
    if (port < bitmap.start || port > bitmap.end) {
      return false;
    }

    return !bitmap.isOccupied(port);
  }

  /**
   * 获取端口统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    this.loadFromDatabase();

    return {
      socks: {
        range: PORT_RANGES.socks,
        occupied: this.bitmaps.socks.getOccupiedCount(),
        available: this.bitmaps.socks.getAvailableCount()
      },
      http: {
        range: PORT_RANGES.http,
        occupied: this.bitmaps.http.getOccupiedCount(),
        available: this.bitmaps.http.getAvailableCount()
      },
      fixed: {
        range: PORT_RANGES.fixed,
        occupied: this.bitmaps.fixed.getOccupiedCount(),
        available: this.bitmaps.fixed.getAvailableCount()
      }
    };
  }

  /**
   * 重新加载端口数据
   */
  reload() {
    this.bitmaps.socks.clear();
    this.bitmaps.http.clear();
    this.bitmaps.fixed.clear();
    this.initialized = false;
    this.loadFromDatabase();
  }
}

// 单例实例
const portAllocator = new PortAllocator();

module.exports = {
  PortAllocator,
  PortBitmap,
  portAllocator,
  PORT_RANGES
};