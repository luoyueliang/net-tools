# SmartXray

基于 Xray-core 的服务端管理工具，支持 SQLite 用户数据库、动态配置生成、防火墙自动管理和 mihomo 配置导出。

## 功能特性

- **用户数据库**：SQLite 存储用户/端口信息，支持增删改查
- **动态配置**：实时生成 `xray config.json`，`SIGUSR1` 热重载无需重启
- **协议支持**：SOCKS5（含 UDP）、HTTP 代理，账号密码认证
- **防火墙联动**：添加/删除用户时自动操作 `ufw` / `firewall-cmd` / `iptables` / pf
- **mihomo 集成**：一键导出 proxies 配置片段，可直接插入 mihomo `config.yaml`
- **Web UI**：内嵌单文件仪表盘（`http://127.0.0.1:9091/`），支持用户管理、状态监控

## 目录结构

```
smartxray/
  src/
    xray-ctl            CLI 主程序（Node.js）
  scripts/
    install.js          安装脚本（自动下载 xray、安装依赖、部署服务）
    platform/
      macos/            com.smartxray.plist（LaunchAgent）
      linux/            smartxray.service（systemd）
      alpine/           smartxray.openrc（OpenRC）
      freebsd/          smartxray（rc.d）
      openwrt/          smartxray（procd）
  config/
    config.example.json xray 配置模板（参考）
  ui/
    index.html          Web 管理界面
  data/                 运行时数据（.gitkeep）
  logs/                 日志（.gitkeep）
  package.json          npm 依赖（better-sqlite3）
```

运行时数据目录：`~/.config/smartxray/`

## 前置要求

- **Node.js ≥ v16** → 参见 [node/README.md](../node/README.md)
- **xray-core** → 安装脚本自动下载，或手动放置到 `/usr/local/bin/xray`
- **npm**（用于安装 `better-sqlite3`）

## 安装

```bash
cd smartxray
node scripts/install.js
```

安装脚本做了以下事情：
1. 创建 `~/.config/smartxray/` 运行时目录
2. 执行 `npm install`（安装 `better-sqlite3`）
3. 从 GitHub releases 下载适合当前平台/架构的 xray 二进制
4. 安装 `xray-ctl` 到 `/usr/local/bin/xray-ctl`
5. 安装平台对应的服务脚本（默认禁用自启）

不下载 xray（已手动安装的场景）：
```bash
node scripts/install.js --no-download
```

## 用法

### 进程管理

```bash
xray-ctl start          # 启动 Xray
xray-ctl stop           # 停止 Xray
xray-ctl restart        # 重启
xray-ctl status         # 查看状态 + 用户列表
xray-ctl reload         # 热重载配置（SIGUSR1）
```

### 用户管理

```bash
# 添加用户（自动分配端口、开放防火墙、热重载）
xray-ctl user add alice
xray-ctl user add bob http          # HTTP 代理
xray-ctl user add carol socks user1 pass123  # 指定账密

# 列出用户
xray-ctl user list

# 删除（关闭防火墙端口 + 热重载）
xray-ctl user del alice

# 启用 / 禁用
xray-ctl user enable  alice
xray-ctl user disable alice

# 修改密码
xray-ctl user passwd alice newpass
```

### 配置

```bash
xray-ctl config                       # 查看当前设置
xray-ctl config server_ip 1.2.3.4    # 设置对外 IP（写入 mihomo 导出配置）
xray-ctl config log_level info        # 日志级别
```

### 导出 mihomo 配置

```bash
xray-ctl export
```

输出 `~/.config/smartxray/mihomo-proxies.yaml`（proxies 片段），追加到 mihomo `config.yaml` 即可将 Xray 管理的节点注册为 mihomo 出站。

### Web UI

```bash
xray-ctl ui
# 访问 http://127.0.0.1:9091/
```

## 配置文件说明

| 文件 | 说明 |
|---|---|
| `config/config.example.json` | xray 配置参考模板 |
| `~/.config/smartxray/smartxray.db` | SQLite 用户数据库（运行时） |
| `~/.config/smartxray/config.json` | 当前生效的 xray 配置（自动生成，勿手动编辑） |
| `~/.config/smartxray/mihomo-proxies.yaml` | 导出的 mihomo proxies 片段 |
| `~/.config/smartxray/logs/xray.log` | xray 运行日志 |
| `data/.gitkeep` | 运行时数据占位 |
| `logs/.gitkeep` | 日志占位 |
