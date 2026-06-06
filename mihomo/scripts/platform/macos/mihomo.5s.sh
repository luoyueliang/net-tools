#!/usr/bin/env bash
# Mihomo 菜单栏插件（xbar / SwiftBar 通用）
#
# <xbar.title>Mihomo Status</xbar.title>
# <xbar.version>v1.0</xbar.version>
# <xbar.author>net-tools</xbar.author>
# <xbar.desc>在菜单栏显示 Mihomo 运行状态与快捷开关，由 mihomo-ctl tray 渲染。</xbar.desc>
# <xbar.dependencies>mihomo-ctl</xbar.dependencies>
#
# 安装：
#   1. 安装 xbar (https://xbarapp.com) 或 SwiftBar (https://github.com/swiftbar/SwiftBar)
#   2. 把本文件复制到插件目录，并赋予可执行权限：
#        cp mihomo.5s.sh "$HOME/Library/Application Support/xbar/plugins/"
#        chmod +x "$HOME/Library/Application Support/xbar/plugins/mihomo.5s.sh"
#      （SwiftBar 用其插件目录；文件名中的 5s 表示每 5 秒刷新一次）
#   3. 刷新 xbar / SwiftBar 即可
#
# 全部展示与菜单动作逻辑都在 `mihomo-ctl tray` 中，本脚本仅做转发。

# 定位 mihomo-ctl（优先 PATH，其次常见安装路径）
CTL="$(command -v mihomo-ctl 2>/dev/null)"
[ -z "$CTL" ] && [ -x /usr/local/bin/mihomo-ctl ] && CTL=/usr/local/bin/mihomo-ctl
[ -z "$CTL" ] && [ -x /opt/homebrew/bin/mihomo-ctl ] && CTL=/opt/homebrew/bin/mihomo-ctl

if [ -z "$CTL" ]; then
  echo "⚠️ Mihomo"
  echo "---"
  echo "未找到 mihomo-ctl | color=red"
  echo "请先安装 mihomo-ctl"
  exit 0
fi

exec "$CTL" tray
