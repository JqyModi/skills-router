# Skills Router 🚀

Skills Router 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的统一技能管理与分发中心。它可以将本地的 Skill 文件夹聚合，并通过 MCP 协议暴露给 AI 平台（如 Claude, Codex, mcp-router 等）。

## 核心特性

- **按需加载 (Lazy Loading)**：Skill 的具体正文指令仅在 AI 调用工具时才会加载进入上下文，显著优化 Token 使用。
- **热加载 (Hot Reloading)**：自动扫描 `skills/` 目录。新增、修改或删除技能后，只需在 AI 中刷新工具列表即可即时生效，无需重启服务。
- **协议透明**：将复杂的本地脚本或长 Prompt 封装为标准的 MCP Tool，降低 AI 平台的配置复杂度。
- **脚本支持**：支持执行本地脚本（Node.js 等），并通过环境变量自动传递参数。

## 项目结构

```text
.
├── packages/
│   └── core/            # 核心逻辑包
│       ├── src/
│       │   ├── core/    # 扫描、解析、执行引擎
│       │   ├── server/  # MCP 服务实现
│       │   └── index.ts
│       └── package.json
├── apps/
│   └── desktop/         # Electron 桌面应用
│       ├── electron/    # Electron 主进程
│       ├── src/         # React 渲染进程
│       └── package.json
├── skills/              # 存放所有 Skill 的目录
│   └── example-skill/   # 具体的技能文件夹
│       ├── SKILL.md     # 技能定义文件（包含 YAML Frontmatter）
│       └── scripts/     # （可选）该技能相关的执行脚本
└── package.json         # 根 package.json (NPM Workspaces)
```

## 🎨 桌面 GUI 应用

本项目提供了一个功能完整的 Electron 桌面应用,用于可视化管理和测试 Skills:

### 主要功能

- **📋 Skill Dashboard**: 列表展示所有可用技能,支持实时刷新
- **✏️ Skill Editor**: 直接在 GUI 中编辑 `SKILL.md` 文件并保存
- **🔧 Skill Simulator**: 配置参数并执行技能,查看输出结果
- **➕ Create/Delete Skills**: 通过 UI 创建新技能或删除现有技能
- **🌓 主题切换**: 支持深色/浅色主题切换,偏好自动保存
- **📱 响应式布局**: 内容区域自动填充窗口,适配不同屏幕尺寸

### 启动 GUI

```bash
cd apps/desktop
npm install
npm run dev
```

应用将自动启动 Electron 窗口并加载技能列表。

## 快速开始

### 方式一: 使用 MCP 服务器 (CLI)

#### 1. 安装依赖
```bash
npm install
```

#### 2. 构建核心包
```bash
cd packages/core
npm run build
```

#### 3. 运行 MCP 服务器
```bash
npm start
```

### 方式二: 使用桌面 GUI

```bash
cd apps/desktop
npm install
npm run dev
```

## 如何添加一个技能

在 `skills/` 目录下创建一个新文件夹，并在其中创建 `SKILL.md`。

### 示例 `SKILL.md` (纯 Prompt 型)

```markdown
---
name: my-writing-skill
description: 一个帮助润色文案的技能。
---

# Writing Assistant
当你调用此工具时，请遵循以下规则进行文案润色：
1. ...
2. ...
```

### 示例 `SKILL.md` (脚本执行型)

```markdown
---
name: hello-skill
description: 执行脚本并返回结果。
parameters:
  userName:
    type: string
    description: 用户名
scripts:
  - node scripts/hello.js
---
```

## MCP 配置参考

在你的 MCP 客户端（如 Claude Desktop）配置中添加：

```json
{
  "mcpServers": {
    "skills-router": {
      "command": "node",
      "args": ["/path/to/skills-router/packages/core/dist/index.js"],
      "env": {
        "SKILLS_DIR": "/path/to/your/custom/skills"
      }
    }
  }
}
```

## 开源协议

ISC License
