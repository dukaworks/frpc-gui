# FRPC GUI 开发文档 (Development Guide)

本文档旨在帮助开发者快速理解 FRPC GUI 的项目架构、核心模块及工作流程，以便于后续的维护和功能开发。

## 1. 项目概览 (Project Overview)

FRPC GUI 是一个基于 Web 技术的 FRPC 可视化管理工具。它的核心设计理念是 **"SSH as a Service"** —— 前端不直接操作文件系统或进程，而是通过 SSH 协议连接到目标服务器（或本地容器宿主机），执行命令和读写配置文件。

### 技术栈 (Tech Stack)

*   **前端 (Frontend)**:
    *   **React 18**: UI 库
    *   **Vite**: 构建工具
    *   **TypeScript**: 静态类型检查
    *   **Tailwind CSS**: 原子化 CSS 框架
    *   **Shadcn UI (Radix UI)**: 高质量 UI 组件库
    *   **Zustand**: 轻量级状态管理 (用于存储 SSH 会话、连接列表)
    *   **Lucide React**: 图标库
    *   **@iarna/toml**: 前端 TOML 解析与生成

*   **后端 (Backend / API Server)**:
    *   **Node.js**: 运行时环境
    *   **Express**: Web 框架
    *   **ssh2**: SSH 客户端库 (核心依赖)
    *   **concurrently**: 开发环境下同时启动前后端

## 2. 架构设计 (Architecture)

```mermaid
graph TD
    User[User Browser] <-->|HTTP/WebSocket| Frontend[React SPA]
    Frontend <-->|REST API| Backend[Express API Server]
    
    subgraph "Backend Service"
        Backend --> SSH_Manager[SSH Connection Manager]
        SSH_Manager -->|1. Connect| Target_Server[Target FRPC Server]
    end
    
    subgraph "Target Server (Linux/Docker)"
        Target_Server -->|2. Read/Write| Config_File[/etc/frp/frpc.toml]
        Target_Server -->|3. Exec| Service_Control[systemctl / docker restart]
        Target_Server -->|4. Poll| Logs[Service Logs]
    end
```

### 核心流程
1.  **连接**: 用户在前端输入 SSH 信息 -> 后端建立 SSH 连接并生成 `sessionId` -> 返回 Session ID 给前端。
2.  **管理**: 前端所有请求（读配置、保存、重启）都带上 `x-session-id` 头 -> 后端根据 ID 找到对应的 SSH 实例 -> 执行远程命令。
3.  **无状态**: 后端服务本身不存储任何业务数据（如代理配置），所有数据直接来源于目标服务器上的 `frpc.toml` 文件。

## 3. 目录结构说明 (Directory Structure)

```
frpc-gui/
├── api/                    # 后端源码
│   ├── routes/             # API 路由定义 (auth, config)
│   ├── services/           # 核心业务逻辑 (sshService.ts)
│   ├── app.ts              # Express App 入口
│   └── server.ts           # HTTP Server 启动
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── ConfigEditor/   # 核心业务组件：配置编辑器
│   │   │   ├── ConfigEditor.tsx      # TOML编辑器主逻辑
│   │   │   ├── ProxyListOverview.tsx # 代理列表视图
│   │   │   └── ...
│   │   └── ui/             # 通用 UI 组件 (Button, Card, etc.)
│   ├── hooks/              # 自定义 Hooks
│   │   └── useFrpcConfig.ts # 核心 Hook：处理 TOML 解析、增删改查逻辑
│   ├── lib/                # 工具库 (api.ts - Axios/Fetch 封装)
│   ├── pages/              # 页面级组件
│   │   ├── Connect.tsx     # 连接页 (SSH 登录)
│   │   └── Dashboard.tsx   # 主控台 (概览、日志、编辑)
│   ├── store/              # Zustand 状态存储
│   │   ├── frpcStore.ts    # 存储当前连接状态、进程信息
│   │   └── userStore.ts    # 存储用户保存的服务器列表 (LocalStorage)
│   └── shared/             # 前后端共用的 TypeScript 类型定义
├── project_docs/           # 项目文档 (非代码)
├── public/                 # 静态资源
├── package.json            # 依赖管理
└── vite.config.ts          # Vite 配置
```

## 4. 核心模块详解 (Core Modules)

### 4.1. SSH 服务 (Backend - `api/services/sshService.ts`)
这是后端最复杂的部分，负责抹平不同环境（Docker vs Systemd vs Process）的差异。
*   **连接池 (`sshManager`)**: 使用 `Map<string, SshService>` 存储活跃的 SSH 连接。
*   **智能扫描 (`scanFrpc`)**:
    1.  **Docker 优先**: 尝试 `docker ps` 查找包含 `frpc` 的容器。如果找到，自动解析挂载路径 (`Mounts`) 来定位配置文件位置。
    2.  **Systemd 次之**: 尝试 `systemctl` 查找 `frpc` 服务，解析 `ExecStart` 获取配置路径。
    3.  **进程兜底**: 使用 `ps -eo` 查找运行中的进程。
*   **文件操作**: 使用 `cat` 读取文件，使用 `echo base64 | base64 -d` 写入文件（防止特殊字符转义问题）。

### 4.2. 配置解析 Hook (Frontend - `src/hooks/useFrpcConfig.ts`)
前端的核心逻辑大脑。
*   **TOML 解析**: 将后端返回的 TOML 字符串解析为 JS 对象。
*   **CRUD 逻辑**: 提供了 `addProxy`, `updateProxy`, `deleteProxy` 等方法，直接操作 JS 对象。
*   **生成器**: 将修改后的 JS 对象重新序列化为标准的 TOML 字符串，并处理了一些 TOML 格式的边缘情况（如 IP 地址引号问题）。

### 4.3. 仪表盘 (Frontend - `src/pages/Dashboard.tsx`)
*   **状态同步**: 页面加载时调用 `loadConfig` 和 `fetchLogs`。
*   **自动保活**: 监听 SSH 连接状态，如果 API 返回 401 (Not Connected)，自动跳转回登录页。
*   **平滑计时**: 使用 `<UptimeDisplay />` 组件，基于后端返回的 `startTimestamp` 在前端每秒更新显示，避免了频繁轮询导致的页面闪烁。

### 4.4. 配置编辑器 (Frontend - `src/components/ConfigEditor/`)
*   **双模式**: 支持 "可视化表单" 和 "源码模式" 切换。
*   **安全锁**: `ConfigEditor.tsx` 实现了只读/编辑模式切换，防止误触。

## 5. 开发工作流 (Workflow)

### 启动开发环境
```bash
npm run dev
# 这会同时启动：
# 1. Vite Server (Frontend): http://localhost:5173
# 2. Nodemon Server (Backend): http://localhost:3001
```

### 调试建议
*   **后端调试**: 查看终端输出，`console.log` 会打印 SSH 连接状态和执行的命令。
*   **前端调试**: 使用 Chrome DevTools，主要关注 Network 面板的 API 请求和 Console 报错。
*   **模拟环境**: 如果没有真实的 FRPC 环境，可以在本地运行一个 Docker 容器，并开启 SSH 服务进行自测。

## 6. 待优化项 (Future Improvements)
*   **多语言支持 (i18n)**: 目前仅支持英文。
*   **本地模式 (Local Mode)**: 允许在安装了 Node.js 的机器上直接管理本地 FRPC，跳过 SSH 环节。
*   **插件系统**: 支持更多 FRP 插件的可视化配置。
