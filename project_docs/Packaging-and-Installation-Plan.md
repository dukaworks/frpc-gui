# 打包与安装部署方案规划

本文档详细阐述了 `frpc-gui` 项目的桌面端封装（Exe）与服务器端部署（Systemd/脚本）的技术实施方案。

## 第一部分：桌面端应用程序打包 (.exe)

目标：生成可在 Windows (及 macOS/Linux 桌面) 上直接运行的独立可执行文件，无需用户安装 Node.js 或配置环境。

### 方案 A：使用 Electron (推荐)
Electron 可以将当前的 React 前端与 Express 后端封装为一个原生的桌面应用程序窗口。这是最成熟、用户体验最好的方案。

**技术架构：**
1.  **主进程 (Main Process)**: Electron 的入口。
    *   负责创建浏览器窗口。
    *   **启动后端服务**: 在 Electron 启动时，作为一个子进程或直接引入模块的方式启动现有的 Express Server (监听指定端口或使用 IPC 通信)。
    *   管理应用生命周期（启动、退出、最小化到托盘）。
2.  **渲染进程 (Renderer Process)**: 现有的 React 前端。
    *   加载 `http://localhost:port` (由内置后端提供) 或直接加载本地 HTML 文件。

**实施步骤：**
1.  **安装依赖**: `electron`, `electron-builder`, `concurrently` (用于开发)。
2.  **入口文件**: 创建 `electron/main.js`，负责启动 Express App 和创建窗口。
3.  **配置构建**: 修改 `package.json`，添加 `build` 配置 (Electron Builder)。
    *   配置 Windows 目标 (`nsis`, `portable`).
    *   配置图标与元数据。
4.  **数据持久化**: 确保 Express 后端读取/写入配置文件的路径适配打包后的环境 (如 `%APPDATA%/frpc-gui/`).

### 方案 B：使用 Pkg (备选)
将 Node.js 环境、后端代码和前端静态资源打包成一个单一的命令行可执行文件 (CLI)。

**特点：**
*   用户运行 `frpc-gui.exe` 后，会弹出一个黑框（终端窗口），显示服务已启动。
*   用户需要手动打开浏览器访问 `http://localhost:3000`。
*   **优点**: 体积比 Electron 小，实现简单。
*   **缺点**: 体验不如原生应用，有关闭终端即停止服务的风险。

---

## 第二部分：Linux 服务器端部署 (Systemd & 一键脚本)

目标：在 Linux 服务器上以守护进程方式运行，支持开机自启，提供简单的一键管理脚本。

### 1. 核心运行方式：二进制化 (Pkg)
为了简化 Linux 上的依赖环境（避免用户手动安装 Node.js、npm install），建议使用 `pkg` 工具将项目打包为单文件二进制程序 `frpc-gui-linux`。

**优势：**
*   **零依赖**: 目标机器无需安装 Node.js。
*   **易分发**: 只需要下载一个文件。

### 2. Systemd 服务配置
创建 `frpc-gui.service` 文件，管理进程的生命周期。

```ini
[Unit]
Description=FRPC GUI Manager Service
After=network.target

[Service]
Type=simple
User=root
# 假设安装在 /usr/local/bin
ExecStart=/usr/local/bin/frpc-gui-linux
Restart=on-failure
Environment=PORT=3000
# 数据目录配置
Environment=CONFIG_DIR=/etc/frpc-gui

[Install]
WantedBy=multi-user.target
```

### 3. 一键安装与卸载脚本

我们将提供 Shell 脚本来自动化上述过程。

#### `install.sh` (安装脚本)
1.  **环境检查**: 检查是否为 Linux，检查架构 (amd64/arm64)。
2.  **下载**: 从 GitHub Releases 下载对应架构的 `frpc-gui-linux` 二进制文件。
3.  **部署**:
    *   移动二进制文件到 `/usr/local/bin/` 并赋予执行权限。
    *   创建配置目录 `/etc/frpc-gui/`。
4.  **服务配置**:
    *   生成并写入 `/etc/systemd/system/frpc-gui.service`。
    *   执行 `systemctl daemon-reload`。
    *   执行 `systemctl enable frpc-gui` 和 `systemctl start frpc-gui`。
5.  **完成提示**: 输出访问地址和基本操作命令。

#### `uninstall.sh` (卸载脚本)
1.  **停止服务**: `systemctl stop frpc-gui` & `systemctl disable frpc-gui`.
2.  **清理文件**:
    *   删除 `/etc/systemd/system/frpc-gui.service`.
    *   删除 `/usr/local/bin/frpc-gui-linux`.
    *   (可选) 询问是否删除配置文件 `/etc/frpc-gui/`.
3.  **重载**: `systemctl daemon-reload`.

---

## 下一步行动建议

1.  **优先执行**: 配置 `electron-builder`，先跑通 Windows Exe 的打包流程，因为这是用户最直观的需求。
2.  **同步进行**: 配置 `pkg` 打包脚本，生成 Linux 二进制文件。
3.  **最后实施**: 基于生成的 Linux 二进制文件，编写 Shell 脚本并进行测试。
