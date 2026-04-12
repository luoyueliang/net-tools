/**
 * 防火墙管理模块
 * 封装本地防火墙和外部防火墙（Lightsail/OpenWrt）操作
 */

const { execSync } = require('child_process');
const os = require('os');
const { getSetting } = require('./database');

// ==================== 本地防火墙 ====================

/**
 * 检测当前平台
 * @returns {string} 平台类型: linux | macos | freebsd | openwrt | windows | unknown
 */
function detectPlatform() {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  if (platform === 'freebsd') return 'freebsd';

  // Linux 下检测是否为 OpenWrt
  try {
    const osRelease = require('fs').readFileSync('/etc/openwrt_release', 'utf8');
    if (osRelease.includes('OpenWrt')) return 'openwrt';
  } catch {}

  if (platform === 'linux') return 'linux';
  return 'unknown';
}

/**
 * 执行 shell 命令（静默模式）
 * @param {string} cmd - 命令
 * @returns {string} 命令输出
 */
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

/**
 * 检查 iptables 规则是否存在
 * @param {string} rule - 规则字符串
 * @returns {boolean}
 */
function iptablesHas(rule) {
  return run(`iptables -C ${rule} 2>/dev/null`) !== '';
}

/**
 * 添加 iptables 规则（如果不存在）
 * @param {string} rule - 规则字符串
 */
function iptablesAdd(rule) {
  if (!iptablesHas(rule)) {
    run(`iptables -A ${rule}`);
  }
}

/**
 * 删除 iptables 规则（如果存在）
 * @param {string} rule - 规则字符串
 */
function iptablesDel(rule) {
  if (iptablesHas(rule)) {
    run(`iptables -D ${rule}`);
  }
}

/**
 * 开放本地防火墙端口
 * @param {number} port - 端口号
 */
function localFirewallOpen(port) {
  const platform = detectPlatform();

  switch (platform) {
    case 'linux':
    case 'openwrt':
      iptablesAdd(`INPUT -p tcp --dport ${port} -j ACCEPT`);
      break;
    case 'macos':
      // macOS 使用 pfctl（简化处理，实际可能需要更复杂的配置）
      run(`echo "pass in proto tcp from any to any port ${port}" | sudo pfctl -f - 2>/dev/null || true`);
      break;
    case 'freebsd':
      run(`ipfw add allow tcp from any to any ${port} 2>/dev/null || true`);
      break;
    case 'windows':
      run(`netsh advfirewall firewall add rule name="smartxray-${port}" dir=in action=allow protocol=tcp localport=${port} 2>nul || echo skip`);
      break;
  }
}

/**
 * 关闭本地防火墙端口
 * @param {number} port - 端口号
 */
function localFirewallClose(port) {
  const platform = detectPlatform();

  switch (platform) {
    case 'linux':
    case 'openwrt':
      iptablesDel(`INPUT -p tcp --dport ${port} -j ACCEPT`);
      break;
    case 'macos':
      // macOS pfctl 简化处理
      break;
    case 'freebsd':
      run(`ipfw delete allow tcp from any to any ${port} 2>/dev/null || true`);
      break;
    case 'windows':
      run(`netsh advfirewall firewall delete rule name="smartxray-${port}" 2>nul || echo skip`);
      break;
  }
}

// ==================== 外部防火墙 ====================

/**
 * 执行外部防火墙操作
 * @param {string} op - 操作类型: open | close
 * @param {number} port - 端口号
 */
function extFwOp(op, port) {
  const mode = getSetting('extfw_mode', 'none');
  if (mode === 'none') return;

  if (mode === 'lightsail') {
    lightsailPort(op, port);
  } else if (mode === 'openwrt') {
    openwrtDnat(op, port);
  }
}

/**
 * AWS Lightsail 安全组端口操作
 * @param {string} op - open | close
 * @param {number} port - 端口号
 */
function lightsailPort(op, port) {
  const instance = getSetting('lightsail_instance', '');
  if (!instance) return;

  const protocol = 'tcp';
  const fromPort = port;
  const toPort = port;

  try {
    if (op === 'open') {
      run(`aws lightsail open-instance-public-ports \
        --instance-name "${instance}" \
        --port-info fromPort=${fromPort},toPort=${toPort},protocol=${protocol} 2>/dev/null`);
    } else {
      run(`aws lightsail close-instance-public-ports \
        --instance-name "${instance}" \
        --port-info fromPort=${fromPort},toPort=${toPort},protocol=${protocol} 2>/dev/null`);
    }
  } catch {}
}

/**
 * OpenWrt DNAT 端口操作
 * @param {string} op - open | close
 * @param {number} port - 端口号
 */
function openwrtDnat(op, port) {
  const host = getSetting('openwrt_host', '');
  const user = getSetting('openwrt_user', 'root');
  const keyPath = getSetting('openwrt_ssh_key', '');
  const destIp = getSetting('openwrt_dest_ip', '');

  if (!host || !destIp) return;

  const sshKey = keyPath ? `-i ${keyPath}` : '';
  const sshCmd = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${sshKey} ${user}@${host}`;

  const ruleName = `smartxray_${port}`;

  try {
    if (op === 'open') {
      // 添加 DNAT 规则
      run(`${sshCmd} "uci set firewall.${ruleName}=redirect"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.name='${ruleName}'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.src='wan'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.proto='tcp'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.src_dport='${port}'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.dest_ip='${destIp}'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.dest_port='${port}'"`);
      run(`${sshCmd} "uci set firewall.${ruleName}.target='DNAT'"`);
      run(`${sshCmd} "uci commit firewall"`);
      run(`${sshCmd} "/etc/init.d/firewall reload"`);
    } else {
      // 删除 DNAT 规则
      run(`${sshCmd} "uci delete firewall.${ruleName} 2>/dev/null || true"`);
      run(`${sshCmd} "uci commit firewall"`);
      run(`${sshCmd} "/etc/init.d/firewall reload"`);
    }
  } catch {}
}

// ==================== 组合操作 ====================

/**
 * 用户端口开放（本地 + 外部防火墙）
 * @param {number} socksPort - SOCKS 端口
 * @param {number} httpPort - HTTP 端口
 */
function userFirewallOpen(socksPort, httpPort) {
  localFirewallOpen(socksPort);
  extFwOp('open', socksPort);
  if (httpPort) {
    localFirewallOpen(httpPort);
    extFwOp('open', httpPort);
  }
}

/**
 * 用户端口关闭（本地 + 外部防火墙）
 * @param {number} socksPort - SOCKS 端口
 * @param {number} httpPort - HTTP 端口
 */
function userFirewallClose(socksPort, httpPort) {
  localFirewallClose(socksPort);
  extFwOp('close', socksPort);
  if (httpPort) {
    localFirewallClose(httpPort);
    extFwOp('close', httpPort);
  }
}

/**
 * 通用防火墙端口开放
 * @param {number} port - 端口号
 */
function firewallOpen(port) {
  localFirewallOpen(port);
  extFwOp('open', port);
}

/**
 * 通用防火墙端口关闭
 * @param {number} port - 端口号
 */
function firewallClose(port) {
  localFirewallClose(port);
  extFwOp('close', port);
}

/**
 * 同步所有用户端口到外部防火墙
 * @param {Array} users - 用户数组
 * @param {Object} realityConfig - Reality 配置
 */
function syncAllPorts(users, realityConfig) {
  for (const u of users) {
    if (u.enabled) {
      extFwOp('open', u.port);
      if (u.http_port) extFwOp('open', u.http_port);
    }
  }
  if (realityConfig && realityConfig.enabled) {
    extFwOp('open', realityConfig.port);
  }
}

module.exports = {
  detectPlatform,
  localFirewallOpen,
  localFirewallClose,
  extFwOp,
  userFirewallOpen,
  userFirewallClose,
  firewallOpen,
  firewallClose,
  syncAllPorts,
  // 兼容性别名
  ssFirewallOpen: userFirewallOpen,
  ssFirewallClose: userFirewallClose
};
