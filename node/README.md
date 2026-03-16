# Node.js 环境说明

本仓库中的 Node.js 工具均要求 **Node.js v16 或更高版本**，无需额外 npm 依赖（仅使用内置模块）。

---

## 安装 Node.js

### macOS

**方式一：Homebrew（推荐）**

```bash
brew install node
```

**方式二：nvm（版本管理器，推荐多版本共存）**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 新开终端后执行
nvm install --lts
nvm use --lts
nvm alias default node
```

**方式三：官方安装包**

访问 [nodejs.org](https://nodejs.org) 下载 macOS pkg 安装包。

---

### Linux（Debian / Ubuntu）

```bash
# 通过 NodeSource 安装 LTS 版本
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Linux（RHEL / CentOS / Fedora）

```bash
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

### Linux（Arch）

```bash
sudo pacman -S nodejs npm
```

---

### FreeBSD

```bash
pkg install node
```

---

### OpenWrt

```bash
opkg update
opkg install node
```

> OpenWrt 的 node 包版本可能较旧，建议从 [openwrt-node-packages](https://github.com/nxhack/openwrt-node-packages) 获取更新版本。

---

## 验证安装

```bash
node --version   # 应输出 v16.x.x 或更高
```

---

## 工具列表

本仓库使用 Node.js 的工具：

| 工具 | 路径 |
|------|------|
| mihomo-ctl | [mihomo/src/mihomo-ctl](../mihomo/src/mihomo-ctl) |
