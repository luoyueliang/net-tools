name: Release __TOOL_NAME__

# 触发：推送 __TOOL_NAME__-vX.Y.Z 格式 tag
# 使用前请全局替换：__TOOL_NAME__ / __CTL_NAME__ / __GITHUB_REPO__ (格式: owner/repo)
on:
  push:
    tags:
      - '__TOOL_NAME__-v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      tag:     ${{ steps.tag.outputs.tag }}
      version: ${{ steps.tag.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: tag
        run: |
          TAG="${GITHUB_REF_NAME}"
          VER="${TAG#__TOOL_NAME__-v}"
          echo "tag=${TAG}"     >> "$GITHUB_OUTPUT"
          echo "version=${VER}" >> "$GITHUB_OUTPUT"

      - name: Create Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${{ steps.tag.outputs.tag }}"
          VER="${{ steps.tag.outputs.version }}"
          BASE="https://github.com/__GITHUB_REPO__/releases/download/${TAG}"
          printf '## __TOOL_NAME__ v%s\n\n'             "${VER}"          > /tmp/notes.md
          printf '### 安装（推荐）\n\n'                                   >> /tmp/notes.md
          printf '```bash\n'                                              >> /tmp/notes.md
          printf 'VER=%s\n' "${VER}"                                      >> /tmp/notes.md
          printf 'curl -LO %s/__TOOL_NAME__-installer-%s.tar.gz\n' "${BASE}" "${VER}" >> /tmp/notes.md
          printf 'tar xzf __TOOL_NAME__-installer-%s.tar.gz\n' "${VER}"  >> /tmp/notes.md
          printf 'cd __TOOL_NAME__-installer-%s/\n' "${VER}"             >> /tmp/notes.md
          printf 'node scripts/install.js\n'                              >> /tmp/notes.md
          printf '```\n\n'                                                >> /tmp/notes.md
          printf '### 自升级（已安装用户）\n\n'                            >> /tmp/notes.md
          printf '```bash\n__CTL_NAME__ upgrade\n```\n\n'                 >> /tmp/notes.md
          printf '> 需已安装 Node.js v16+\n'                              >> /tmp/notes.md
          gh release create "${TAG}" \
            --title "__TOOL_NAME__ v${VER}" \
            --notes-file /tmp/notes.md \
            --repo __GITHUB_REPO__ || \
            echo "Release already exists, will upload assets to existing release"

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build release assets
        working-directory: __TOOL_NAME__
        run: |
          npm install --ignore-scripts 2>/dev/null || true
          node scripts/release.js

      - name: Upload all assets to Release
        working-directory: __TOOL_NAME__
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${{ steps.tag.outputs.tag }}"
          VER="${{ steps.tag.outputs.version }}"
          gh release upload "${TAG}" \
            "dist/__TOOL_NAME__-installer-${VER}.tar.gz" \
            "dist/__CTL_NAME__-${VER}.gz" \
            --clobber \
            --repo __GITHUB_REPO__
