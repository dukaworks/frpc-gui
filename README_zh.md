# Frpc-GUI

<p align="center">
  <img src="src/assets/dukaworks-logo-left-with-words.png" alt="DukaWorks Logo" width="220" />
</p>

<p align="center">
  <strong>通过浏览器图形界面远程管理 Frpc — 告别命令行编辑</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8A2BE2.svg" alt="License"></a>
  <a href="https://github.com/dukaworks/frpc-gui/releases"><img src="https://img.shields.io/github/v/release/dukaworks/frpc-gui?display_name=tag&sort=semver" alt="Release"></a>
  <a href="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml"><img src="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg" alt="Docker Build"></a>
  <a href="https://github.com/dukaworks/frpc-gui/actions/workflows/desktop-release.yml"><img src="https://github.com/dukaworks/frpc-gui/actions/workflows/desktop-release.yml/badge.svg" alt="Desktop Build"></a>
  <br>
  <a href="https://x.com/dukatalk"><img src="https://img.shields.io/badge/X-Follow%20@dukatalk-black.svg?logo=x" alt="X"></a>
  <a href="https://t.me/zychen2022"><img src="https://img.shields.io/badge/Telegram-Channel-8A2BE2.svg?logo=telegram" alt="Telegram"></a>
  <a href="https://t.me/+wmMDJOMbU9FhMmNl"><img src="https://img.shields.io/badge/Telegram-Community-8A2BE2.svg?logo=telegram" alt="Telegram"></a>
</p>

<p align="center">
  [ <a href="./README.md">English</a> | <strong>中文</strong> ]
</p>

---

## 这是什么？

**Frpc-GUI** 把 "SSH 登录 + nano 编辑配置" 变成可视化操作。通过 SSH 连接到服务器，就能增删改代理、调整配置、重启服务 — 全程图形界面。

> **适用场景**：路由器、NAS、服务器（PVE、OpenWrt、飞牛 fnOS 等）上运行的 frpc。

## 功能特性

| 功能 | 说明 |
|------|------|
| 🚀 **SSH 远程管理** | 在本地电脑管理任意运行 frpc 的服务器 |
| 🎨 **可视化编辑器** | 表单式代理编辑 — 无需手写 TOML |
| 🔄 **增删改查** | 单个或批量添加、编辑、删除代理 |
| 🖥️ **多服务器支持** | 保存并快速切换多个 SSH 连接 |
| 📊 **实时日志** | 查看运行日志和服务状态 |
| 📄 **TOML/INI 双支持** | 支持 `frpc.toml` 和传统 `.ini` 格式 |

## 截图预览

<table>
<tr>
<td align="center"><strong>仪表盘</strong><br/><img src="docs/screenshots/zh/03-dashboard-overview.png" width="280"/></td>
<td align="center"><strong>代理管理</strong><br/><img src="docs/screenshots/zh/04-proxies.png" width="280"/></td>
<td align="center"><strong>配置编辑</strong><br/><img src="docs/screenshots/zh/05-config-editor.png" width="280"/></td>
</tr>
</table>

## 快速开始

### 桌面版（推荐）

从 **[GitHub Releases](https://github.com/dukaworks/frpc-gui/releases)** 下载：

| 平台 | 下载格式 |
|------|----------|
| Windows | `.exe` 安装包 或 `.zip` |
| macOS | `.dmg` |
| Linux | `.deb` |

### Docker

**一条命令运行：**
```bash
docker run -d --name frpc-gui -p 3000:3000 ghcr.io/dukaworks/frpc-gui:latest
```
然后访问 `http://localhost:3000`

**Docker Compose 方式：**
```bash
docker compose up -d
```

**一体机模式（frpc + GUI 合运行）：**
```bash
docker compose -f docker-compose.aio.yml up -d
```
首次启动会自动生成 starter `frpc.toml` 配置文件。

**在已有 frpc 的服务器上部署（Native Local）：**
```bash
docker compose -f docker-compose.local.yml up -d
```
挂载你已有的 `frpc.toml`，frpc-gui 自动发现并管理运行中的 frpc，无需 SSH。

### 开发调试

```bash
git clone https://github.com/dukaworks/frpc-gui.git
cd frpc-gui
npm install
npm run dev
```

本地构建桌面安装包：
```bash
npm run electron:build
```

## 工作原理

### 模式一：SSH 远程管理（默认）

```
┌─────────────┐   SSH 连接   ┌─────────────────┐
│  Frpc-GUI  │ ───────────> │   远程服务器     │
│  (你的电脑)  │             │   (运行着 frpc)  │
└─────────────┘             └─────────────────┘
```

- Frpc-GUI 运行在你本地电脑，通过 SSH 连接远程服务器
- 所有操作通过 SSH 会话在远程执行

### 模式二：本机直连（Native Local，无需 SSH）

将 Frpc-GUI **部署在 frpc 同一台机器上**，无需 SSH。

```
┌──────────────────────────────────────┐
│  运行 frpc 的机器                     │
│  ┌────────────┐    ┌──────────────┐  │
│  │ frpc       │    │ Frpc-GUI     │  │
│  │ (服务)      │    │ (本机模式)    │  │
│  └────────────┘    └──────────────┘  │
└──────────────────────────────────────┘
```

- Frpc-GUI 自动检测 frpc（Docker / systemd / 进程）
- 完整服务控制：启动 / 停止 / 重启
- 实时日志：`docker logs` 或 `journalctl`
- **Docker 部署**：需要挂载 `/var/run/docker.sock`
- **直接安装**：无需额外配置

### 部署方式对比

| 部署场景 | 推荐模式 | 方式 |
|---------|---------|------|
| 你的电脑，管理远程服务器 | SSH 远程 | 桌面应用或浏览器访问 |
| frpc 同机（Docker 环境） | 本机直连 | `docker-compose.aio.yml` |
| frpc 同机（裸机环境） | 本机直连 | 桌面应用或直接 npm 安装 |

## 安全说明

- SSH 凭据**仅存储在本地**（浏览器/桌面应用存储）
- 桌面版服务绑定到 `127.0.0.1` — 不暴露到网络
- **建议**：使用 SSH 密钥登录，避免密码方式

## 配置参考

详见 **[frpc_sample.toml](./frpc_sample.toml)**，包含 TCP、UDP、HTTP、HTTPS、STCP、XTCP 及插件配置示例。

## 获取帮助

- **GitHub Issues**: [反馈问题](https://github.com/dukaworks/frpc-gui/issues)
- **Telegram 频道**: [@zychen2022](https://t.me/zychen2022)
- **Telegram 群组**: [加入讨论](https://t.me/+wmMDJOMbU9FhMmNl)
- **邮箱**: dukaworks.zy@gmail.com

## 开源协议

MIT — 详见 [LICENSE](./LICENSE)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/dukaworks">DukaWorks</a></sub>
</p>
