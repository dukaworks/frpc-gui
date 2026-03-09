# FRPC GUI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.5-green.svg)
[![Docker Build & Publish](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/dukaworks/frpc-gui/actions/workflows/docker-publish.yml)

**English** | [中文](./README_zh.md)

**Web-based GUI for managing FRPC configurations remotely via SSH.**

FRPC GUI allows you to manage your FRPC (Fast Reverse Proxy Client) configuration files visually. Instead of editing TOML/INI files manually on the server, you can use this modern web interface to add, edit, and delete proxies, manage multiple servers, and view real-time logs.

## Features

*   **Remote Management**: Connect to any server running FRPC via SSH.
*   **Visual Configuration**: User-friendly form-based editor for FRPC proxies.
*   **Full CRUD Support**: Add, Edit, Delete (Single/Batch) proxies easily.
*   **Multi-Server Support**: Save and switch between multiple FRPC server profiles.
*   **Real-time Logs**: View live logs from the running FRPC service (Docker, Systemd, or Process).
*   **Safety First**: Built-in configuration backup and "Restart Service" safety checks.
*   **TOML Support**: Native support for the modern TOML configuration format.

## Quick Start

### Docker (Recommended)

**Option 1: Docker Compose (Easiest)**

```bash
# Pull and run the latest official image
docker-compose up -d
```
Access the dashboard at `http://localhost:3000`.

**Option 2: Docker Run**

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

## Configuration Reference

A comprehensive sample configuration file is included in this repository to help you understand all available options.

*   [**frpc_sample.toml**](./frpc_sample.toml): Contains examples for TCP, UDP, HTTP, HTTPS, STCP, XTCP, and Plugin configurations.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
