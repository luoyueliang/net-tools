# SmartXray 使用帮助

SmartXray 为每个用户提供 **SOCKS5 代理** 和 **HTTP 代理** 两种连接方式，部分场景还提供 **VLESS+Reality**（最强抗审查协议）。获取账户信息后，请根据您的操作系统选择对应设置方法。

## 您需要的信息

| 项目 | 说明 |
|------|------|
| 服务器地址 | 管理员提供的服务器 IP 或域名 |
| SOCKS5 端口 | 用户面板中显示的 SOCKS5 端口 |
| HTTP 端口 | 用户面板中显示的 HTTP 端口 |
| 用户名 | 您的认证用户名 |
| 密码 | 您的认证密码 |

> 如果服务器开启了**共享端口模式**，所有用户使用同一端口，通过用户名密码区分身份。

---

## Windows

### 系统全局代理（HTTP）

1. 打开 **设置** → **网络和 Internet** → **代理**
2. 在「手动设置代理」中**开启**
3. **地址**填入服务器 IP，**端口**填入 HTTP 端口
4. 点击保存

> ⚠ Windows 系统代理仅支持 HTTP，不支持 SOCKS5 认证。建议使用浏览器插件。

### 浏览器代理

**Chrome / Edge（推荐 SwitchyOmega 插件）：**

1. 安装 [Proxy SwitchyOmega](https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif) 扩展
2. 新建情景模式，选择代理服务器
3. 协议选 **SOCKS5** 或 **HTTP**，填入服务器 IP 和端口
4. 在「认证」（Auth）中填入用户名和密码
5. 点击「应用选项」

**Firefox：**

1. **设置** → **常规** → **网络设置** → **设置…**
2. 选择 **手动代理配置**
3. **SOCKS 主机**填入服务器 IP，端口填入 SOCKS 端口，选择 **SOCKS v5**
4. 勾选 **使用 SOCKS v5 时代理 DNS**
5. 如需认证：在地址栏输入 `about:config`，搜索 `network.proxy.socks_remote_dns` 设为 true

### 命令行

```powershell
# PowerShell — 设置 HTTP 代理（当前会话）
$env:HTTP_PROXY = "http://用户名:密码@服务器IP:HTTP端口"
$env:HTTPS_PROXY = "http://用户名:密码@服务器IP:HTTP端口"

# CMD — 设置 HTTP 代理（当前会话）
set HTTP_PROXY=http://用户名:密码@服务器IP:HTTP端口
set HTTPS_PROXY=http://用户名:密码@服务器IP:HTTP端口
```

---

## macOS

### 系统全局代理

1. 打开 **系统设置** → **网络** → 选择当前网络连接 → **详细信息** → **代理**
2. **SOCKS 代理**：填入服务器 IP 和 SOCKS 端口，填入用户名和密码
3. **Web 代理（HTTP）**：填入服务器 IP 和 HTTP 端口，填入用户名和密码
4. **安全 Web 代理（HTTPS）**：同上

### 终端

```bash
# 在 ~/.zshrc 或 ~/.bashrc 中添加（永久生效）：
export http_proxy="http://用户名:密码@服务器IP:HTTP端口"
export https_proxy="http://用户名:密码@服务器IP:HTTP端口"
export all_proxy="socks5://用户名:密码@服务器IP:SOCKS端口"

# 临时使用（仅当前终端会话）：
export ALL_PROXY="socks5h://用户名:密码@服务器IP:SOCKS端口"
```

> `socks5h://` 表示 DNS 解析也通过代理，推荐使用。

---

## Linux

### 环境变量（推荐）

```bash
# 在 ~/.bashrc 或 ~/.profile 中添加：
export http_proxy="http://用户名:密码@服务器IP:HTTP端口"
export https_proxy="http://用户名:密码@服务器IP:HTTP端口"
export all_proxy="socks5://用户名:密码@服务器IP:SOCKS端口"
export no_proxy="localhost,127.0.0.1,::1,10.0.0.0/8,192.168.0.0/16"
```

### GNOME 桌面

```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '服务器IP'
gsettings set org.gnome.system.proxy.socks port SOCKS端口
gsettings set org.gnome.system.proxy.http host '服务器IP'
gsettings set org.gnome.system.proxy.http port HTTP端口
```

### KDE Plasma

**系统设置** → **网络** → **代理** → **手动配置** → 填入服务器信息

### APT 包管理器

```bash
# 创建 /etc/apt/apt.conf.d/proxy.conf：
Acquire::http::Proxy "http://用户名:密码@服务器IP:HTTP端口";
Acquire::https::Proxy "http://用户名:密码@服务器IP:HTTP端口";
```

### Git

```bash
git config --global http.proxy "socks5://用户名:密码@服务器IP:SOCKS端口"
git config --global https.proxy "socks5://用户名:密码@服务器IP:SOCKS端口"

# 取消代理：
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

## iOS

### WiFi 代理（HTTP）

1. 打开 **设置** → **WiFi** → 点击已连接网络旁的 **(i)** 图标
2. 滚动到最下方 → **HTTP 代理** → 选择 **手动**
3. **服务器**填入服务器 IP
4. **端口**填入 HTTP 端口
5. **鉴权**开启，填入用户名和密码

> ⚠ iOS 原生不支持 SOCKS5 代理。如需 SOCKS5 或 VLESS，请使用第三方客户端。

### Shadowrocket（推荐，支持 SOCKS5 / VLESS）

1. 打开 Shadowrocket → 点击右上角 **+**
2. 类型选择 **SOCKS5**
3. 地址填入服务器 IP，端口填入 SOCKS 端口
4. 填入用户名和密码
5. 保存并连接

### Quantumult X

1. **设置** → **节点** → **添加** → **手动添加**
2. 选择 SOCKS5 或 HTTP 类型，填入服务器信息

---

## Android

### WiFi 代理（HTTP）

1. 打开 **设置** → **WiFi** → 长按已连接的网络 → **修改网络**
2. 展开 **高级选项**
3. 代理选择 **手动**
4. **代理主机**填入服务器 IP
5. **代理端口**填入 HTTP 端口

> ⚠ Android 原生 WiFi 代理不支持认证。如需认证代理，请使用以下第三方客户端。

### NekoBox / SagerNet（推荐）

1. 打开应用 → 点击 **+** 添加配置
2. 选择 **SOCKS** 类型
3. 填入服务器地址、端口、用户名、密码
4. 保存并启动

### Surfboard

1. **配置** → **添加节点** → **代理** → 选择 SOCKS5 或 HTTP
2. 填入服务器信息并保存

---

## 通用命令行工具

### curl

```bash
# 通过 SOCKS5 代理
curl -x socks5h://用户名:密码@服务器IP:SOCKS端口 https://example.com

# 通过 HTTP 代理
curl -x http://用户名:密码@服务器IP:HTTP端口 https://example.com
```

### wget

```bash
wget -e use_proxy=yes \
     -e http_proxy="http://用户名:密码@服务器IP:HTTP端口" \
     -e https_proxy="http://用户名:密码@服务器IP:HTTP端口" \
     https://example.com
```

### SSH（通过 SOCKS5 跳板连接）

```bash
ssh -o ProxyCommand='nc -x 服务器IP:SOCKS端口 -X 5 %h %p' user@target-host
```

### Docker

```bash
# ~/.docker/config.json
{
  "proxies": {
    "default": {
      "httpProxy": "http://用户名:密码@服务器IP:HTTP端口",
      "httpsProxy": "http://用户名:密码@服务器IP:HTTP端口",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

---

## 常见应用代理配置

许多开发工具和应用程序**不走系统代理**，需要单独配置。

### npm / yarn / pnpm

```bash
# npm — 设置 HTTP 代理
npm config set proxy http://用户名:密码@服务器IP:HTTP端口
npm config set https-proxy http://用户名:密码@服务器IP:HTTP端口

# 取消代理
npm config delete proxy
npm config delete https-proxy

# yarn
yarn config set httpProxy http://用户名:密码@服务器IP:HTTP端口
yarn config set httpsProxy http://用户名:密码@服务器IP:HTTP端口

# pnpm（同 npm）
pnpm config set proxy http://用户名:密码@服务器IP:HTTP端口
pnpm config set https-proxy http://用户名:密码@服务器IP:HTTP端口
```

### pip (Python)

```bash
# 临时使用
pip install --proxy http://用户名:密码@服务器IP:HTTP端口 包名

# 永久配置 — 创建 ~/.config/pip/pip.conf（Linux/macOS）
[global]
proxy = http://用户名:密码@服务器IP:HTTP端口
```

### Go

```bash
export GOPROXY="https://proxy.golang.org,direct"
export HTTP_PROXY="http://用户名:密码@服务器IP:HTTP端口"
export HTTPS_PROXY="http://用户名:密码@服务器IP:HTTP端口"
```

### Telegram

Telegram 桌面版和移动版均需手动配置代理：

**桌面版（macOS / Windows / Linux）：**

1. 打开 Telegram → **设置** → **高级** → **代理设置** → **添加代理**
2. 选择 **SOCKS5**
3. **服务器**填入服务器 IP
4. **端口**填入 SOCKS5 端口
5. **用户名**和**密码**填入您的账户信息
6. 保存并启用

**移动版（iOS / Android）：**

1. **设置** → **数据和存储** → **代理设置** → **添加代理**
2. 类型选择 **SOCKS5**
3. 填入服务器 IP、SOCKS5 端口、用户名、密码

> Telegram 不支持 HTTP 代理认证，请使用 SOCKS5。

### Spotify

Spotify 桌面版：

1. **设置** → 滚动到底部 → **显示高级设置**
2. **代理** → 代理类型选择 **SOCKS5**
3. 填入服务器 IP、SOCKS5 端口、用户名、密码
4. 重启 Spotify

### Steam

1. 在 Steam 启动参数中添加：
```bash
# 或使用命令行启动
steam -tcp -http_proxy http://用户名:密码@服务器IP:HTTP端口
```

2. 或通过系统环境变量设置（Linux/macOS）：
```bash
export HTTP_PROXY="http://用户名:密码@服务器IP:HTTP端口"
export HTTPS_PROXY="http://用户名:密码@服务器IP:HTTP端口"
steam
```

### Homebrew (macOS)

Homebrew 读取环境变量，在终端中设置即可：

```bash
export ALL_PROXY=socks5h://用户名:密码@服务器IP:SOCKS端口
brew update && brew upgrade
```

### Docker

```bash
# 方法 1：~/.docker/config.json
{
  "proxies": {
    "default": {
      "httpProxy": "http://用户名:密码@服务器IP:HTTP端口",
      "httpsProxy": "http://用户名:密码@服务器IP:HTTP端口",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}

# 方法 2：daemon 级别 — /etc/docker/daemon.json 或 systemd override
# 创建 /etc/systemd/system/docker.service.d/proxy.conf：
[Service]
Environment="HTTP_PROXY=http://用户名:密码@服务器IP:HTTP端口"
Environment="HTTPS_PROXY=http://用户名:密码@服务器IP:HTTP端口"
# 然后 systemctl daemon-reload && systemctl restart docker
```

### VS Code

1. **设置**（Ctrl+,）→ 搜索 `proxy`
2. **Http: Proxy** 填入 `http://用户名:密码@服务器IP:HTTP端口`
3. 如需终端也走代理，勾选 **Http: Proxy Support** 为 `override`

或在 `settings.json` 中添加：

```json
{
  "http.proxy": "http://用户名:密码@服务器IP:HTTP端口",
  "http.proxyStrictSSL": false
}
```

### Gradle (Android Studio / Java)

```properties
# 在 ~/.gradle/gradle.properties 中添加：
systemProp.http.proxyHost=服务器IP
systemProp.http.proxyPort=HTTP端口
systemProp.http.proxyUser=用户名
systemProp.http.proxyPassword=密码
systemProp.https.proxyHost=服务器IP
systemProp.https.proxyPort=HTTP端口
systemProp.https.proxyUser=用户名
systemProp.https.proxyPassword=密码
```

### 通用方案：proxychains（Linux/macOS）

对于完全不支持代理设置的应用，可使用 `proxychains` 强制走代理：

```bash
# 安装 (macOS)
brew install proxychains-ng

# 安装 (Linux)
apt install proxychains4

# 配置 /etc/proxychains.conf 或 ~/.proxychains/proxychains.conf：
# 在最后一行添加：
socks5  服务器IP  SOCKS端口  用户名  密码

# 使用
proxychains4 任意命令
# 例如：
proxychains4 curl https://www.google.com
proxychains4 npm install
```

---

## 常见问题

**Q: HTTP 代理和 SOCKS5 代理有什么区别？**

HTTP 代理工作在应用层，只代理 HTTP/HTTPS 流量，兼容性最好。SOCKS5 代理工作在传输层，可代理所有 TCP/UDP 流量（包括游戏、DNS 等），功能更强。

**Q: 设置了代理后无法连接？**

请逐步检查：① 服务器 IP 和端口是否正确 ② 用户名密码是否正确 ③ 服务器防火墙是否已开放对应端口 ④ 本地网络是否允许连接该端口（公司网络可能有限制）

**Q: 什么是 VLESS+Reality？**

VLESS+Reality 是目前最强的抗审查代理协议，流量伪装为访问合法网站（如 microsoft.com），极难被检测和封锁。需要使用支持该协议的客户端（如 v2rayN、Shadowrocket、NekoBox）。

**Q: 如何取消代理设置？**

删除或注释掉对应的环境变量，或在系统/浏览器设置中关闭代理。重启终端或浏览器使更改生效。

**Q: socks5:// 和 socks5h:// 有什么区别？**

`socks5://` 表示本地解析 DNS 后通过代理连接；`socks5h://` 表示 DNS 也通过代理解析，后者更安全，推荐使用。
