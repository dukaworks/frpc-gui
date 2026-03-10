# Frpc-GUI

<p align="center">
  <img src="project_docs/images/dukaworks-logo-up-with-words.png" alt="DukaWorks Logo" width="200" />
</p>

<p align="center">
  <strong>基于 Web 的 Frpc 远程配置管理工具（通过 SSH）</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8A2BE2.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/version-0.1.7-8A2BE2.svg" alt="Version">
  <a href="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml"><img src="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg" alt="Docker Build & Publish"></a>
  <br>
  <a href="https://x.com/dukatalk"><img src="https://img.shields.io/badge/X-Follow%20@dukatalk-black.svg?logo=x" alt="Follow on X"></a>
  <a href="https://t.me/zychen2022"><img src="https://img.shields.io/badge/Telegram-Channel-8A2BE2.svg?logo=telegram" alt="Telegram Channel"></a>
  <a href="https://t.me/+wmMDJOMbU9FhMmNl"><img src="https://img.shields.io/badge/Telegram-Community-8A2BE2.svg?logo=telegram" alt="Telegram Community"></a>
</p>

<p align="center">
  [ <a href="./README.md">English</a> | <strong>中文</strong> ]
</p>

---

**Frpc-GUI** 是由 **DukaWorks (DUKA工作室)** 开发的一款现代化、用户友好的 Web 界面，用于管理您的 Frpc (Fast Reverse Proxy Client) 配置文件。您无需再通过 SSH 登录服务器手动编辑 TOML/INI 文件，而是可以使用这个可视化的仪表盘来轻松添加、编辑、删除代理，管理多个服务器，并查看实时日志。

## ✨ 功能特性

- 🚀 **远程管理**：通过 SSH 连接到任何运行 Frpc 的服务器。
- 🎨 **可视化配置**：用户友好的表单式编辑器，轻松管理 Frpc 代理配置。
- 🔄 **完整的 CRUD 支持**：轻松添加、编辑、删除（单个/批量）代理。
- 🖥️ **多服务器支持**：保存并在多个 Frpc 服务器配置之间快速切换。
- 📊 **实时日志**：查看正在运行的 Frpc 服务（Docker、Systemd 或进程）的实时日志。
- 🛡️ **安全优先**：内置配置备份和“重启服务”时的安全检查机制。
- 📄 **TOML 支持**：原生支持现代化的 TOML 配置文件格式。

## 💡 使用场景与部署建议

*   **桌面环境 (Released Versions)**
    *   推荐在 **Windows PC、macOS、笔记本电脑** 或 **Linux 桌面环境** 中使用。通过 SSH 连接远程管理运行在服务器、NAS 或路由器上的 frpc 服务。

*   **生产环境管理 (Remote Management)**
    *   对于运行在 **PVE、OpenWrt (如 iStoreOS)、飞牛 (fnOS)** 等生产环境中的 frpc，建议将 Frpc-GUI 安装在独立的管理设备（如您的笔记本）上，通过 SSH 远程管理。这种“控制面与数据面分离”的部署方式更符合网络稳健性原则，避免管理工具对生产环境造成不必要的干扰。

*   **未来规划 (Roadmap)**
    *   我们计划推出 **Frpc + GUI 的 All-In-One Docker 镜像**，实现开箱即用。届时，Frpc-GUI 可作为默认的 Web 管理端直接部署在目标设备上，与 frpc 无缝集成。

## 📦 快速开始

### Docker (推荐)

#### 选项 1: Docker Compose (最简单)

```bash
# 拉取并运行最新的官方镜像
docker-compose up -d
```

访问 Dashboard：`http://localhost:3000`。

#### 选项 2: Docker Run

```bash
docker run -d \
  --name frpc-gui \
  -p 3000:3000 \
  -v /path/to/your/frpc.toml:/etc/frp/frpc.toml \
  ghcr.io/dukaworks/frpc-gui:latest
```

### 手动安装

1.  克隆仓库：
    ```bash
    git clone https://github.com/dukaworks/frpc-gui.git
    cd frpc-gui
    ```

2.  安装依赖：
    ```bash
    npm install
    ```

3.  启动开发服务器：
    ```bash
    npm run dev
    ```

### 桌面客户端 (Electron)

您可以为您的操作系统（Windows, macOS 或 Linux）构建独立的桌面应用程序。

1.  构建应用程序：
    ```bash
    npm run electron:build
    ```

2.  生成的安装包/可执行文件将位于 `release` 目录下。

## ⚙️ 配置参考

本仓库包含一份详尽的示例配置文件，帮助您了解所有可用选项。

*   [**frpc_sample.toml**](./frpc_sample.toml): 包含 TCP, UDP, HTTP, HTTPS, STCP, XTCP 以及插件配置的示例。

## 🤝 社区与支持

**DukaWorks (DUKA工作室)** 致力于为开发者创造实用的工具。

*   **GitHub**: [github.com/dukaworks](https://github.com/dukaworks)
*   **X / Twitter**: [@dukatalk](https://x.com/dukatalk)
*   **Telegram 频道**: [@zychen2022](https://t.me/zychen2022)
*   **Telegram 社区**: [加入群组](https://t.me/+wmMDJOMbU9FhMmNl)
*   **邮箱**: [dukaworks.zy@gmail.com](mailto:dukaworks.zy@gmail.com)

## 🤝 贡献指南

欢迎贡献代码！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解我们的行为准则以及提交 Pull Request 的流程。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/dukaworks">DukaWorks</a></sub>
</p>
