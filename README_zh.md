# FRPC GUI

![DukaWorks Logo](public/dukaworks-logo-up-with-words.png)

**基于 Web 的 FRPC 远程配置管理工具（通过 SSH）**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.1.5-green.svg)
[![Docker Build & Publish](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml)

[![Follow on X](https://img.shields.io/badge/X-Follow%20@dukatalk-black.svg?logo=x)](https://x.com/dukatalk)
[![Telegram Channel](https://img.shields.io/badge/Telegram-Channel-blue.svg?logo=telegram)](https://t.me/zychen2022)
[![Telegram Community](https://img.shields.io/badge/Telegram-Community-blue.svg?logo=telegram)](https://t.me/+wmMDJOMbU9FhMmNl)

[ [English](./README.md) | **中文** ]

---

**FRPC GUI** 是由 **DukaWorks (DUKA工作室)** 开发的一款现代化、用户友好的 Web 界面，用于管理您的 FRPC (Fast Reverse Proxy Client) 配置文件。您无需再通过 SSH 登录服务器手动编辑 TOML/INI 文件，而是可以使用这个可视化的仪表盘来轻松添加、编辑、删除代理，管理多个服务器，并查看实时日志。

## ✨ 功能特性

- 🚀 **远程管理**：通过 SSH 连接到任何运行 FRPC 的服务器。
- 🎨 **可视化配置**：用户友好的表单式编辑器，轻松管理 FRPC 代理配置。
- 🔄 **完整的 CRUD 支持**：轻松添加、编辑、删除（单个/批量）代理。
- 🖥️ **多服务器支持**：保存并在多个 FRPC 服务器配置之间快速切换。
- 📊 **实时日志**：查看正在运行的 FRPC 服务（Docker、Systemd 或进程）的实时日志。
- 🛡️ **安全优先**：内置配置备份和“重启服务”时的安全检查机制。
- 📄 **TOML 支持**：原生支持现代化的 TOML 配置文件格式。

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

Built with ❤️ by [DukaWorks](https://github.com/dukaworks)
