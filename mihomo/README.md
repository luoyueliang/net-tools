# mihomo-ctl

多平台 Mihomo (Clash Meta) 代理管理 CLI 工具，基于 Node.js 编写，无需额外依赖包。  
支持 **macOS · Linux · FreeBSD · Alpine · OpenWrt**，单脚本跨平台运行。

**Mihomo 项目**: [github.com/MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo)

## 功能特性

- 启动 / 停止 / 重启 / **热重载** Mihomo 进程（跨平台）
- 配置文件**语法检查**
- 一键**模式切换**（rule / global / direct）
- **实时流量**速率监控（SSE 流）
- **活跃连接**查看与一键断开
- **GeoIP / GeoSite 数据自动更新**（立即下载 + cron 定时任务）
- 系统代理接管 / 恢复（**macOS 专属**，其他平台用环境变量）
- DNS 防污染接管（macOS：pf 重定向 + DoH；**Linux · Alpine：iptables 重定向 53→1053**）
- 交互式节点选择（↑↓ 切换 Enter 确认）
- 节点延迟测速
- **无缝升级** Mihomo 二进制（预下载完成后才停机，自动备份+失败回滚，显示版本对比）
- 开机自启管理（各平台使用对应服务管理器）
- 日志开关与实时查看

## 目录结构

```
mihomo/
├── src/
│   └── mihomo-ctl                    # Node.js CLI 主脚本
├── scripts/
│   ├── install.js                    # 安装脚本（自动检测平台）
│   └── platform/
│       ├── macos/
│       │   └── mihomo.plist          # macOS LaunchAgent 模板
│       ├── linux/
│       │   └── mihomo.service        # systemd 服务文件
│       ├── alpine/
│       │   └── mihomo.openrc         # Alpine Linux OpenRC 脚本
│       ├── freebsd/
│       │   └── mihomo.rc             # FreeBSD rc.d 脚本
│       └── openwrt/
│           └── mihomo.init           # OpenWrt init.d 脚本
├── config/
│   ├── config.yaml                   # 主配置模板
│   └── clash-config.yaml             # ClashX Pro 订阅配置模板
├── ui/
│   └── index.html                    # Web UI 单文件仪表盘
├── data/                             # GeoIP / GeoSite 数据文件目录
├── logs/                             # 日志目录
└── README.md
```

## 前置要求

### 安装 Node.js

`mihomo-ctl` 及安装脚本均为 Node.js 编写，运行前需安装 **Node.js v16 或更高版本**。

各平台安装方式请参阅：**[../node/README.md](../node/README.md)**

快速安装（macOS）：

```bash
# Homebrew
brew install node

# 或 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
```

验证：

```bash
node --version   # v16.x.x 或更高
```

## 安装

```bash
# 进入 mihomo 目录
cd mihomo

# 执行安装脚本（Node.js 脚本，自动检测平台）
node scripts/install.js
```

安装脚本会完成以下操作：
1. 检查 Node.js 版本（≥ v16）
2. 检测当前平台（macOS / Linux / FreeBSD / OpenWrt / Alpine）和架构（amd64 / arm64）
3. 下载最新版 mihomo 二进制到 `/usr/local/bin/mihomo`
4. 创建配置目录 `~/.config/mihomo/{data,logs}`
5. 将 `config/config.yaml` 复制到 `~/.config/mihomo/config.yaml`（已存在则跳过）
6. 安装对应平台的启动脚本（macOS / Linux systemd / Alpine OpenRC / FreeBSD rc.d / OpenWrt init.d，默认禁用自启）
7. 将 `mihomo-ctl` 安装到 `/usr/local/bin/mihomo-ctl`

安装完成后编辑配置文件，填入你的节点信息：

```bash
nano ~/.config/mihomo/config.yaml
```

## 用法

**状态 & 控制**

```
mihomo-ctl                    查看状态（含 GeoIP 新鲜度、连接数）
mihomo-ctl start              启动进程 + 自动开启系统代理
mihomo-ctl stop               停止进程 + 自动关闭系统代理
mihomo-ctl restart            重启进程 + 自动恢复系统代理
mihomo-ctl reload             热重载配置文件（不中断连接）
mihomo-ctl upgrade            无缝升级（预下载完成后才停机，自动备份+失败回滚）
mihomo-ctl check              检查配置文件语法
```

**模式切换**

```
mihomo-ctl mode               查看当前模式
mihomo-ctl mode rule          规则分流（默认）
mihomo-ctl mode global        全局代理（全部走代理）
mihomo-ctl mode direct        全局直连（跳过代理）
```

**GeoIP / GeoSite 数据**

```
mihomo-ctl geo                查看数据文件状态及定时任务
mihomo-ctl geo update         立即下载最新 geoip.dat / geosite.dat
mihomo-ctl geo schedule       设置每周一 03:00 自动更新（cron）
mihomo-ctl geo unschedule     取消自动更新
```

**连接监控**

```
mihomo-ctl traffic            实时流量速率（Ctrl+C 退出）
mihomo-ctl connections        列出活跃连接
mihomo-ctl connections close-all  断开所有连接
```

**Web UI**

```
mihomo-ctl ui                 查看 Web UI 安装状态
mihomo-ctl ui install         安装到 ~/.config/mihomo/ui/（自动写入 external-ui）
mihomo-ctl ui open            浏览器打开 http://127.0.0.1:9090/ui/
```

**配置备份 & 恢复**

```
mihomo-ctl backup             备份当前 config.yaml（带时间戳）
mihomo-ctl restore            列出所有备份
mihomo-ctl restore latest     恢复最新备份
mihomo-ctl restore <时间戳>   恢复指定备份
```

**节点管理**

```
mihomo-ctl proxies            列出所有节点及延迟
mihomo-ctl test               测速所有节点（约 10s）
mihomo-ctl select             交互式切换节点 ↑↓Enter
mihomo-ctl select <组> <节点>  直接切换
```

**开机自启（默认禁用）**

```
mihomo-ctl autostart          查看自启状态
mihomo-ctl autostart on       启用开机自启
mihomo-ctl autostart off      禁用开机自启
```

> 各平台服务管理器：macOS → launchd · Linux → systemd · Alpine → OpenRC · FreeBSD → rc.d · OpenWrt → init.d

**系统代理（需 sudo，macOS 专属）**

> 其他平台请使用终端临时代理：`export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890`

```
mihomo-ctl proxy-on           接管当前路由接口的 HTTP/HTTPS/SOCKS 代理
mihomo-ctl proxy-off          关闭系统代理（浏览器恢复直连）
```

**DNS 防污染（需 sudo，macOS · Linux · Alpine）**

> **macOS**：pf 端口重定向（53→1053）+ 设置系统 DNS 为 127.0.0.1，仅接管默认路由接口。  
> **Linux / Alpine**：iptables 重定向（OUTPUT -p udp/tcp --dport 53 → 1053），无需修改 resolv.conf，需 sudo。

```
mihomo-ctl dns                查看 DNS 接管状态（显示接口名）
mihomo-ctl dns-on             接管当前路由接口 DNS → Mihomo DoH
mihomo-ctl dns-off            恢复系统 DNS（DHCP）
```

**日志（默认关闭）**

```
mihomo-ctl log                查看最近 50 行日志
mihomo-ctl log-on             开启日志 (info)
mihomo-ctl log-off            关闭日志 (silent)
tail -f ~/.config/mihomo/logs/mihomo.log
```

**终端临时代理（所有平台）**

```bash
export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890
unset https_proxy http_proxy
```

## 平台支持

| 功能 | macOS | Linux | FreeBSD | Alpine | OpenWrt |
|------|:---:|:---:|:---:|:---:|:---:|
| 启动 / 停止 / 重启 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 热重载 / 模式切换 / 节点管理 | ✓ | ✓ | ✓ | ✓ | ✓ |
| proxy-on / proxy-off（系统代理）| ✓ | — | — | — | — |
| dns-on / dns-off（DNS 接管）| ✓ | ✓ | — | ✓ | — |
| 开机自启 | launchd | systemd | rc.d | OpenRC | init.d |

> macOS 使用 pf；Linux / Alpine 使用 iptables（均内置于 mihomo-ctl，无需手动配置）。OpenWrt DNS 接管需自行配置。

## 配置文件说明

| 文件 / 目录 | 说明 |
|------------|------|
| `config/config.yaml` | 主配置模板，安装时复制到 `~/.config/mihomo/config.yaml` |
| `config/clash-config.yaml` | ClashX Pro 订阅配置模板 |
| `scripts/platform/macos/mihomo.plist` | macOS LaunchAgent 模板，安装时复制到 `~/Library/LaunchAgents/` |
| `scripts/platform/linux/mihomo.service` | Linux systemd 服务文件 |
| `scripts/platform/alpine/mihomo.openrc` | Alpine Linux OpenRC 脚本，安装到 `/etc/init.d/mihomo` |
| `scripts/platform/freebsd/mihomo.rc` | FreeBSD rc.d 脚本 |
| `scripts/platform/openwrt/mihomo.init` | OpenWrt init.d 脚本 |
| `data/` | GeoIP / GeoSite 数据文件（geoip.dat、geosite.dat），运行时放入 `~/.config/mihomo/data/` |
| `logs/` | 日志目录占位，运行时日志写入 `~/.config/mihomo/logs/mihomo.log` |

运行时配置位于 `~/.config/mihomo/`，与本仓库相互独立：

```
~/.config/mihomo/
  config.yaml         # 主配置（节点信息在此）
  data/               # GeoIP / GeoSite 数据文件
  logs/               # 日志文件
    mihomo.log
  backups/            # 配置备份（mihomo-ctl backup / upgrade 自动创建）
```

## 端口说明

| 端口 | 用途 |
|------|------|
| `7890` | HTTP/SOCKS5 混合代理端口 |
| `9090` | RESTful API 控制端口 |
| `1053` | DNS 监听端口（dns-on 模式） |
