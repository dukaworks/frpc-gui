# FRPC GUI

<p align="center">
  <img src="project_docs/images/dukaworks-logo-left-with-words.png" alt="DukaWorks Logo" width="150" />
</p>

**Web-based GUI for managing FRPC configurations remotely via SSH**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.1.5-green.svg)
[![Docker Build & Publish](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml)

[![Follow on X](https://img.shields.io/badge/X-Follow%20@dukatalk-black.svg?logo=x)](https://x.com/dukatalk)
[![Telegram Channel](https://img.shields.io/badge/Telegram-Channel-blue.svg?logo=telegram)](https://t.me/zychen2022)
[![Telegram Community](https://img.shields.io/badge/Telegram-Community-blue.svg?logo=telegram)](https://t.me/+wmMDJOMbU9FhMmNl)

[ **English** | [中文](./README_zh.md) ]

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

Built with ❤️ by [DukaWorks](https://github.com/dukaworks)
