# FRPC GUI

<p align="center">
  <img src="public/dukaworks-logo-up-with-words.png" alt="DukaWorks Logo" width="200" />
</p>

<p align="center">
  <strong>Web-based GUI for managing FRPC configurations remotely via SSH</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/version-0.1.5-green.svg" alt="Version">
  <a href="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml"><img src="https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg" alt="Docker Build & Publish"></a>
  <br>
  <a href="https://x.com/dukatalk"><img src="https://img.shields.io/badge/X-Follow%20@dukatalk-black.svg?logo=x" alt="Follow on X"></a>
  <a href="https://t.me/zychen2022"><img src="https://img.shields.io/badge/Telegram-Channel-blue.svg?logo=telegram" alt="Telegram Channel"></a>
  <a href="https://t.me/+wmMDJOMbU9FhMmNl"><img src="https://img.shields.io/badge/Telegram-Community-blue.svg?logo=telegram" alt="Telegram Community"></a>
</p>

<p align="center">
  [ <strong>English</strong> | <a href="./README_zh.md">中文</a> ]
</p>

---

**FRPC GUI** is a modern, user-friendly web interface developed by **DukaWorks** for managing your FRPC (Fast Reverse Proxy Client) configuration files. Instead of editing TOML/INI files manually via SSH, you can use this visual dashboard to add, edit, and delete proxies, manage multiple servers, and view real-time logs with ease.

## ✨ Features

- 🚀 **Remote Management**: Connect to any server running FRPC via SSH.
- 🎨 **Visual Configuration**: User-friendly form-based editor for FRPC proxies.
- 🔄 **Full CRUD Support**: Add, Edit, Delete (Single/Batch) proxies easily.
- 🖥️ **Multi-Server Support**: Save and switch between multiple FRPC server profiles.
- 📊 **Real-time Logs**: View live logs from the running FRPC service (Docker, Systemd, or Process).
- 🛡️ **Safety First**: Built-in configuration backup and "Restart Service" safety checks.
- 📄 **TOML Support**: Native support for the modern TOML configuration format.

## 📦 Quick Start

### Docker (Recommended)

#### Option 1: Docker Compose (Easiest)

```bash
# Pull and run the latest official image
docker-compose up -d
```

Access the dashboard at `http://localhost:3000`.

#### Option 2: Docker Run

```bash
docker run -d \
  --name frpc-gui \
  -p 3000:3000 \
  -v /path/to/your/frpc.toml:/etc/frp/frpc.toml \
  ghcr.io/dukaworks/frpc-gui:latest
```

### Manual Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/dukaworks/frpc-gui.git
    cd frpc-gui
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## ⚙️ Configuration Reference

A comprehensive sample configuration file is included in this repository to help you understand all available options.

*   [**frpc_sample.toml**](./frpc_sample.toml): Contains examples for TCP, UDP, HTTP, HTTPS, STCP, XTCP, and Plugin configurations.

## 🤝 Community & Support

**DukaWorks** is dedicated to creating useful tools for developers.

*   **GitHub**: [github.com/dukaworks](https://github.com/dukaworks)
*   **X / Twitter**: [@dukatalk](https://x.com/dukatalk)
*   **Telegram Channel**: [@zychen2022](https://t.me/zychen2022)
*   **Telegram Community**: [Join Group](https://t.me/+wmMDJOMbU9FhMmNl)
*   **Email**: [dukaworks.zy@gmail.com](mailto:dukaworks.zy@gmail.com)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/dukaworks">DukaWorks</a></sub>
</p>
