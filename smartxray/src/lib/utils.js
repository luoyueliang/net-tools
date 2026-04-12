/**
 * 工具函数模块
 * 存放通用的工具函数
 */

/**
 * 发送 JSON 响应
 * @param {Object} res - HTTP 响应对象
 * @param {number} status - HTTP 状态码
 * @param {Object} data - 响应数据
 */
function apiResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(data));
}

/**
 * 解析请求体
 * @param {Object} req - HTTP 请求对象
 * @returns {Promise<Object>} 解析后的 JSON 对象
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('JSON 解析失败'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 执行 shell 命令
 * @param {string} cmd - 要执行的命令
 * @returns {string} 命令输出
 */
function run(cmd) {
  try {
    return require('child_process').execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

/**
 * 生成随机字符串
 * @param {number} len - 字符串长度
 * @param {string} chars - 可选字符集
 * @returns {string} 随机字符串
 */
function randStr(len = 16, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

/**
 * 生成随机十六进制字符串
 * @param {number} len - 字节长度
 * @returns {string} 十六进制字符串
 */
function randHex(len = 16) {
  return require('crypto').randomBytes(len).toString('hex');
}

/**
 * 生成 UUID
 * @returns {string} UUID 字符串
 */
function newUUID() {
  return require('crypto').randomUUID();
}

module.exports = {
  apiResponse,
  parseBody,
  run,
  randStr,
  randHex,
  newUUID
};