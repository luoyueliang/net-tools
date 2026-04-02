# SmartXray

基于 Xray-core 的服务端管理工具，支持 SQLite 用户数据库、动态配置生成、防火墙自动管理和 mihomo 配置导出。

## 功能特性

- **用户数据库**：SQLite 存储用户/端口信息，支持增删改查
- **动态配置**：实时生成 `xray config.json`，`SIGUSR1` 热重载无需重启
- **协议支持**：SOCKS5（含 UDP）、HTTP 代理，账号密码认证；VLESS + XTLS-Reality
- **共享端口模式**：所有用户复用同一 SOCKS/HTTP 端口，通过账密区分身份，减少端口暴露
- **防火墙联动**：添加/删除用户时自动操作 `ufw` / `firewall-cmd` / `iptables` / pf；支持 AWS Lightsail 安全组和 OpenWrt DNAT 同步
- **mihomo 集成**：一键导出 proxies 配置片段，可直接插入 mihomo `config.yaml`
- **Web UI**：内嵌单文件仪表盘（`http://<server>:9091/`），支持登录密码保护、用户管理、状态监控、帮助文档
- **自助申请**：邮件验证码自动创建临时账户，支持自定义有效期
- **自升级**：从 GitHub Release 下载最新 bundle 并替换

## 目录结构

```
smartxray/
  src/
    xray-ctl            CLI 主程序（Node.js）
  scripts/
    install.js          安装脚本（自动下载 xray、安装依赖、部署服务）
    release.js          打包发布脚本
    platform/
      macos/            com.smartxray.plist（LaunchAgent）
      linux/            smartxray.service（systemd）
      alpine/           smartxray.openrc（OpenRC）
      freebsd/          smartxray（rc.d）
      openwrt/          smartxray（init.d / procd）
  config/
    config.example.json xray 配置模板（参考）
  ui/
    index.html          Web 管理界面
    self-service.html   用户自助申请页面
    help.md             帮助文档（代理设置指南）
  data/                 运行时数据（.gitkeep）
  logs/                 日志（.gitkeep）
  package.json          npm 依赖（node-sqlite3-wasm, nodemailer）
```

运行时数据目录：`~/.config/smartxray/`

## 前置要求

- **Node.js ≥ v18** → 参见 [node/README.md](../node/README.md)
- **xray-core** → 安装脚本自动下载，或手动放置到 `/usr/local/bin/xray`
- **npm**（用于安装 `node-sqlite3-wasm`、`nodemailer`）

## 安装

```bash
cd smartxray
node scripts/install.js
```

安装脚本做了以下事情：
1. Node.js 版本检查（≥ v18）
2. 检测代理环境变量（可手动输入代理地址加速 GitHub 下载）
3. 执行 `npm install`（安装 `node-sqlite3-wasm`、`nodemailer`）
4. 从 GitHub releases 下载适合当前平台/架构的 xray 二进制
5. 创建 `~/.config/smartxray/` 运行时目录
6. 安装平台对应的服务脚本（默认禁用自启）
7. 安装 `xray-ctl` 到 `/usr/local/bin/xray-ctl`
8. 安装 Web UI 到 `~/.config/smartxray/ui/`

不下载 xray（已手动安装的场景）：
```bash
node scripts/install.js --no-download
```

## 用法

### 进程管理

```bash
xray-ctl start               # 启动 Xray
xray-ctl stop                # 停止 Xray
xray-ctl restart             # 重启
xray-ctl status              # 查看状态 + 用户列表
xray-ctl reload              # 热重载配置（SIGUSR1）
xray-ctl autostart on|off    # 开机自启管理（跨平台）
```

### 用户管理

```bash
# 添加用户（自动分配凭据、热重载）
xray-ctl user add alice
xray-ctl user add carol socks user1 pass123     # 指定账密
xray-ctl user add temp socks u1 p1 2            # 2 小时临时账户

# 列出用户
xray-ctl user list

# 删除
xray-ctl user del alice

# 启用 / 禁用
xray-ctl user enable  alice
xray-ctl user disable alice

# 修改密码
xray-ctl user passwd alice newpass

# 手动指定端口（WAN 转发场景）
xray-ctl user set-port alice 13350 17890
```

### Reality（VLESS + XTLS-Reality）

```bash
xray-ctl reality init [port] [dest]  # 生成密钥对并启用 Reality
xray-ctl reality import <priv> <pub> [port] [shortId] [dest]  # 导入现有密钥
xray-ctl reality show                # 查看 Reality 配置
xray-ctl reality disable             # 禁用 Reality
```

### 自助申请（邮件验证 → 临时账户）

```bash
xray-ctl selfservice                  # 查看状态
xray-ctl selfservice on|off           # 开关
xray-ctl selfservice hours 4          # 设置账户有效期（小时）
xray-ctl selfservice smtp <host> <port> <user> <pass> [from]  # 配置 SMTP
```

### 配置

```bash
xray-ctl config                              # 查看所有设置
xray-ctl config server_ip 1.2.3.4           # 对外 IP
xray-ctl config log_level info               # 日志级别
xray-ctl config shared_socks_port 1080       # 共享 SOCKS5 端口（所有用户共用）
xray-ctl config shared_http_port 7890        # 共享 HTTP 端口（所有用户共用）
xray-ctl config admin_password <密码>        # 设置 Web UI 登录密码
xray-ctl config merge_inbounds 1             # 仅替换 inbounds，保留现有路由/出站
xray-ctl config use_upstream 1               # 启用上游出站转发
```

> **共享端口模式**：设置 `shared_socks_port` 和 `shared_http_port` 后，所有用户共享同一端口，通过用户名密码区分身份。这样只需暴露 2 个端口（+ Reality 端口），避免开放过多 TCP 端口被检测。

### LAN 无认证入站

```bash
xray-ctl lan list                            # 列出 LAN 入站
xray-ctl lan add http  192.168.0.3 7890      # 添加无认证 HTTP 入站
xray-ctl lan add socks 192.168.0.3 1080      # 添加无认证 SOCKS 入站
xray-ctl lan del 7890                        # 删除入站（按端口或 tag）
```

### 防火墙自动同步

```bash
xray-ctl firewall                             # 查看当前模式
xray-ctl firewall lightsail <实例名>          # 启用 AWS Lightsail 安全组同步
xray-ctl firewall openwrt <IP> [用户] [密钥] [LAN-IP]  # 启用 OpenWrt DNAT 同步
xray-ctl firewall off                         # 关闭外部防火墙同步
xray-ctl firewall sync                        # 同步所有已有用户端口
```

### 导出 mihomo 配置

```bash
xray-ctl export
```

输出 `~/.config/smartxray/mihomo-proxies.yaml`（proxies 片段），追加到 mihomo `config.yaml` 即可将 Xray 管理的节点注册为 mihomo 出站。

### Web UI

```bash
xray-ctl ui
# 访问 http://<server-ip>:9091/
# 自助申请页: http://<server-ip>:9091/self
```

支持功能：概览、用户管理、导出配置、防火墙、配置编辑、设置、帮助文档。设置 `admin_password` 后访问需要登录。

### 升级

```bash
xray-ctl upgrade              # 从 GitHub Release 自升级 xray-ctl
```

## 配置文件说明

| 文件 | 说明 |
|---|---|
| `config/config.example.json` | xray 配置参考模板 |
| `ui/help.md` | 帮助文档（代理设置指南，安装时复制到运行时目录） |
| `~/.config/smartxray/smartxray.db` | SQLite 用户数据库（运行时） |
| `~/.config/smartxray/config.json` | 当前生效的 xray 配置（自动生成，勿手动编辑） |
| `~/.config/smartxray/mihomo-proxies.yaml` | 导出的 mihomo proxies 片段 |
| `~/.config/smartxray/logs/xray.log` | xray 运行日志 |
| `~/.config/smartxray/ui/` | Web UI 文件（运行时） |
| `data/.gitkeep` | 运行时数据占位 |
| `logs/.gitkeep` | 日志占位 |
