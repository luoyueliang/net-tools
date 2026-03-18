# toolstpl — Node.js 跨平台网络工具脚手架

基于 [mihomo](../mihomo/) 工具提炼的通用脚手架，包含平台适配器模式、统一安装框架和启动脚本模板。

## 目录结构

```
toolstpl/
  src/
    tool-ctl              控制脚本模板（含平台适配器骨架）
  scripts/
    install.js            安装脚本模板
    platform/
      macos/              tool.plist（LaunchAgent 模板）
      linux/              tool.service（systemd 模板）
      alpine/             tool.openrc（OpenRC 模板）
      freebsd/            tool.rc（rc.d 模板）
      openwrt/            tool.init（procd 模板）
  config/
    config.example.yaml   配置模板
  data/                   运行时数据占位（.gitkeep）
  logs/                   日志占位（.gitkeep）
```

## 快速开始

### 1. 复制模板

```bash
cp -r toolstpl <新工具名>
cd <新工具名>
```

### 2. 替换占位符

用编辑器的**全局替换**功能，将以下占位符全部替换：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `__TOOL_NAME__` | 工具目录名 / 服务名 | `mytool` |
| `__CTL_NAME__` | 管理命令名 | `mytool-ctl` |
| `__BIN_NAME__` | 核心二进制文件名 | `mytool` |
| `__PLIST_ID__` | macOS LaunchAgent Bundle ID | `io.github.user.mytool` |
| `__API_PORT__` | 管理 API 端口 | `9090` |
| `__VERSION__` | 初始版本号 | `1.0.0` |

> `__HOME__` 和 `__USER__` 是运行时由安装脚本动态替换的，**无需手动修改**。

### 3. 重命名文件

```bash
mv src/tool-ctl               src/<工具名>-ctl
mv scripts/platform/macos/tool.plist   scripts/platform/macos/<工具名>.plist
mv scripts/platform/linux/tool.service scripts/platform/linux/<工具名>.service
mv scripts/platform/alpine/tool.openrc scripts/platform/alpine/<工具名>.openrc
mv scripts/platform/freebsd/tool.rc    scripts/platform/freebsd/<工具名>.rc
mv scripts/platform/openwrt/tool.init  scripts/platform/openwrt/<工具名>.init
```

### 4. 实现核心逻辑

打开 `src/<工具名>-ctl`，搜索 `TODO`，填入工具特有的命令和启动参数：

- 修改 `startProcess()` 中的二进制启动命令
- 添加工具特有 API 调用（`apiGet()` / `apiPut()` 工具函数已提供）
- 在主入口 `switch` 和 `cmdHelp()` 中注册新命令

### 5. 实现二进制下载

在 `scripts/install.js` 的 `installBin()` 函数中，按注释示例实现工具二进制的下载逻辑。

### 6. 完善 README

按仓库规范补全工具的 README.md（功能特性 → 目录结构 → 前置要求 → 安装 → 用法 → 配置文件说明）。

---

## 脚手架能力一览

### 平台适配器模式

```
detectPlatform() → macos | linux | alpine | freebsd | openwrt
       ↓
PLATFORM_ADAPTERS[platform]
       ↓
P.startProcess()       启动（launchctl / systemctl / rc-service / service / init.d）
P.stopProcess()        停止
P.getPid()             获取 PID
P.isAutostartEnabled() 检查开机自启状态
P.enableAutostart()    启用开机自启（跨平台）
P.disableAutostart()   禁用开机自启（跨平台）
P.installBin()         安装二进制（macOS 自动去除检疫属性）
```

### 统一命令框架

| 命令 | 说明 |
|------|------|
| `status` | 查看服务运行状态 |
| `start` | 启动服务 |
| `stop` | 停止服务 |
| `restart` | 重启服务 |
| `autostart on\|off` | 开机自启管理（跨平台） |
| `log` | 查看最近日志 |
| `help` | 显示帮助 |

### 安装脚本步骤框架

| 步骤 | 说明 |
|------|------|
| Step 1 | Node.js 版本检查（≥ v16） |
| Step 2 | 代理检测与设置（访问 GitHub 前） |
| Step 3 | 下载并安装核心二进制 |
| Step 4 | 创建运行时目录（configDir / dataDir / logsDir） |
| Step 5 | 安装配置模板 |
| Step 6 | 安装平台服务脚本（含占位符替换） |
| Step 7 | 安装控制命令到 `/usr/local/bin/` |
| Step 8 | 安装 Web UI（可选） |

### 支持平台

| 平台 | 服务管理 | 启动脚本 |
|------|----------|----------|
| macOS | LaunchAgent (launchctl) | `platform/macos/tool.plist` |
| Linux (systemd) | systemd (systemctl) | `platform/linux/tool.service` |
| Alpine Linux | OpenRC (rc-service) | `platform/alpine/tool.openrc` |
| FreeBSD | rc.d (service / sysrc) | `platform/freebsd/tool.rc` |
| OpenWrt | procd (init.d) | `platform/openwrt/tool.init` |

---

## 前置要求

- **Node.js ≥ v16** → 参见 [node/README.md](../node/README.md)
