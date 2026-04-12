/**
 * 自助申请路由模块
 * 处理自助申请和验证码 API
 */

const { getSetting, createVerification, verifyCode } = require('../database');
const { apiResponse } = require('../utils');
const { addUser } = require('../user-manager');
const { getSsPortRange, randStr } = require('../config');

/**
 * 执行 shell 命令
 */
function run(cmd) {
  try {
    return require('child_process').execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

/**
 * 发送邮件
 */
async function sendMail(to, subject, text) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: getSetting('smtp_host'),
    port: parseInt(getSetting('smtp_port', '587')),
    secure: getSetting('smtp_secure', '0') === '1',
    auth: {
      user: getSetting('smtp_user'),
      pass: getSetting('smtp_pass')
    }
  });

  await transporter.sendMail({
    from: getSetting('smtp_from', getSetting('smtp_user')),
    to,
    subject,
    text
  });
}

/**
 * 检查自助申请条件
 */
function checkSelfserviceConditions() {
  const errors = [];
  const smtpHost = getSetting('smtp_host', '');
  if (!smtpHost) errors.push('未配置 SMTP');
  const portRange = getSsPortRange(getSetting);
  if (portRange.socksMin >= portRange.socksMax) errors.push('自助端口区间未配置');
  return errors;
}

/**
 * 处理发送验证码请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleSendCode(req, res, json) {
  const { email } = json;
  if (!email) {
    return apiResponse(res, 400, { error: '请填写邮箱' });
  }

  // 检查自助申请是否开启
  if (getSetting('selfservice_enabled', '0') !== '1') {
    return apiResponse(res, 400, { error: '自助申请未开启' });
  }

  // 生成验证码
  const code = randStr(6, '0123456789');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分钟有效

  try {
    createVerification(email, code, expiresAt);
    await sendMail(email, '【SmartXray】验证码', `您的验证码是: ${code}\n\n有效期 10 分钟。`);
    return apiResponse(res, 200, { ok: true });
  } catch (e) {
    return apiResponse(res, 500, { error: '发送失败: ' + e.message });
  }
}

/**
 * 处理自助申请请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {Object} json - 请求体
 */
async function handleSelfserviceApply(req, res, json) {
  const { email, code } = json;

  // 验证验证码
  const verification = verifyCode(email, code);
  if (!verification) {
    return apiResponse(res, 400, { error: '验证码无效或已过期' });
  }

  // 检查自助申请是否开启
  if (getSetting('selfservice_enabled', '0') !== '1') {
    return apiResponse(res, 400, { error: '自助申请未开启' });
  }

  // 检查条件
  const errors = checkSelfserviceConditions();
  if (errors.length > 0) {
    return apiResponse(res, 400, { error: '条件不满足: ' + errors.join('; ') });
  }

  try {
    // 创建用户
    const hours = parseInt(getSetting('selfservice_hours', '2')) || 2;
    const name = `ss_${randStr(6)}`;
    const user = addUser({ name, hours, note: `自助申请: ${email}` });

    return apiResponse(res, 200, {
      ok: true,
      user: {
        name: user.name,
        username: user.username,
        password: user.password,
        port: user.port,
        http_port: user.http_port,
        expires_at: user.expires_at
      }
    });
  } catch (e) {
    return apiResponse(res, 500, { error: '创建用户失败: ' + e.message });
  }
}

/**
 * 处理检查自助申请状态请求
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 */
function handleSelfserviceStatus(req, res) {
  const enabled = getSetting('selfservice_enabled', '0') === '1';
  const errors = checkSelfserviceConditions();
  return apiResponse(res, 200, {
    enabled,
    available: enabled && errors.length === 0,
    errors
  });
}

module.exports = {
  handleSendCode,
  handleSelfserviceApply,
  handleSelfserviceStatus
};