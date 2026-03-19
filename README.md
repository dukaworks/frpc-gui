# Frpc-GUI

<p align="center">
  <img src="src/assets/dukaworks-logo-left-with-words.png" alt="DukaWorks Logo" width="220" />
</p>

<p align="center">
  <strong>Visual dashboard for managing Frpc via SSH — no more terminal editing</strong>
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
  [ <strong>English</strong> | <a href="./README_zh.md">中文</a> ]
</p>

---

## What is this?

**Frpc-GUI** replaces "SSH + nano" with a visual interface. Connect to your server via SSH, then add/edit/delete proxies, tweak settings, and restart the service — all from a clean dashboard.

> **Best for**: Routers, NAS, servers (PVE, OpenWrt, fnOS, etc.) where frpc runs remotely.

## Features

| Feature | What it does |
|---------|-------------|
| 🚀 **SSH Remote** | Manage any server running frpc from your local machine |
| 🎨 **Visual Editor** | Form-based proxy editor — no need to write TOML by hand |
| 🔄 **CRUD Operations** | Add, edit, delete proxies (single or batch) |
| 🖥️ **Multi-Server** | Save and switch between multiple SSH connections |
| 📊 **Live Logs** | View real-time logs and service status |
| 📄 **TOML/INI** | Supports both `frpc.toml` and legacy `.ini` formats |

## Screenshots

<table>
<tr>
<td align="center"><strong>Dashboard</strong><br/><img src="docs/screenshots/en/03-dashboard-overview.png" width="280"/></td>
<td align="center"><strong>Proxy Editor</strong><br/><img src="docs/screenshots/en/04-proxies.png" width="280"/></td>
<td align="center"><strong>Config Editor</strong><br/><img src="docs/screenshots/en/05-config-editor.png" width="280"/></td>
</tr>
</table>

## Quick Start

### Desktop App (Recommended)

Download from **[GitHub Releases](https://github.com/dukaworks/frpc-gui/releases)**:

| Platform | Download |
|----------|----------|
| Windows | `.exe` installer or `.zip` |
| macOS | `.dmg` |
| Linux | `.deb` |

### Docker

**One-liner:**
```bash
docker run -d --name frpc-gui -p 3000:3000 ghcr.io/dukaworks/frpc-gui:latest
```
Then open `http://localhost:3000`

**With Docker Compose:**
```bash
docker compose up -d
```

**All-In-One (frpc + GUI together):**
```bash
docker compose -f docker-compose.aio.yml up -d
```
This auto-creates a starter `frpc.toml` on first run.

**On an existing frpc server (Native Local):**
```bash
docker compose -f docker-compose.local.yml up -d
```
Mount your existing `frpc.toml` — frpc-gui auto-discovers the running frpc and manages it without SSH.

### Development

```bash
git clone https://github.com/dukaworks/frpc-gui.git
cd frpc-gui
npm install
npm run dev
```

Build desktop app locally:
```bash
npm run electron:build
```

## How It Works

### Mode 1: SSH Remote (Default)

```
┌─────────────┐    SSH     ┌─────────────────┐
│ Frpc-GUI    │ ─────────> │ Remote Server   │
│ (Your PC)   │            │ (runs frpc)     │
└─────────────┘            └─────────────────┘
```

- Frpc-GUI runs on your PC, connects to remote server via SSH
- All operations execute through the SSH session

### Mode 2: Native Local (No SSH)

Deploy Frpc-GUI **on the same machine** as frpc. No SSH needed.

```
┌──────────────────────────────────────┐
│  Machine running frpc                │
│  ┌────────────┐    ┌──────────────┐  │
│  │ frpc       │    │ Frpc-GUI     │  │
│  │ (service)  │    │ (local mode) │  │
│  └────────────┘    └──────────────┘  │
└──────────────────────────────────────┘
```

- Frpc-GUI auto-discovers frpc via Docker, systemd, or process scan
- Full service control: start / stop / restart
- Live logs via `docker logs` or `journalctl`
- **Docker**: Mount `/var/run/docker.sock` into the container
- **Direct install**: No extra setup needed

### Deployment Comparison

| Deploy on | Recommended Mode | How |
|-----------|-----------------|-----|
| Your PC, manage remote server | SSH Remote | Desktop app or browser |
| Same machine as frpc (Docker) | Native Local | `docker-compose.aio.yml` |
| Same machine as frpc (bare metal) | Native Local | Desktop app or direct npm install |

## Security

- SSH credentials stored **locally only** (browser/app storage)
- Desktop app binds to `127.0.0.1` — not exposed to network
- **Recommendation**: Use SSH keys instead of passwords

## Config Reference

See **[frpc_sample.toml](./frpc_sample.toml)** for examples of TCP, UDP, HTTP, HTTPS, STCP, XTCP, and plugins.

## Support

- **GitHub Issues**: [Report bugs](https://github.com/dukaworks/frpc-gui/issues)
- **Telegram Channel**: [@zychen2022](https://t.me/zychen2022)
- **Telegram Group**: [Join Discussion](https://t.me/+wmMDJOMbU9FhMmNl)
- **Email**: dukaworks.zy@gmail.com

## License

MIT — see [LICENSE](./LICENSE)

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/dukaworks">DukaWorks</a></sub>
</p>
