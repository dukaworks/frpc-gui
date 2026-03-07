# FRPC Manager - Product Requirements Document (PRD)

## 1. Product Overview
FRPC Manager is a graphical user interface (GUI) tool designed for Home-Lab users to simplify the management of `frpc` (Fast Reverse Proxy Client) configurations. It solves the pain point of manually editing `config.toml` files via terminal by providing a modern, user-friendly web interface to manage connections, edit configurations, and monitor status.

## 2. Target Audience
- **Home-Lab Users**: Users running services on PVE, NAS, or local servers who need to expose them via FRP.
- **Developers**: Users who frequently adjust port mappings and proxy configurations.

## 3. Core Features

### 3.1 Connection Management
- **SSH-based Connection**: Connect to the remote machine (where frpc is installed) using IP, Username, and Password/PrivateKey.
- **Auto-Discovery (Scanning)**:
  - Upon connection, automatically scan the remote machine for running `frpc` processes.
  - Detect the location of the configuration file (e.g., `frpc.toml` or `frpc.ini`) from the running process arguments.
  - Fallback search in common directories (e.g., `/etc/frp/`, `/usr/local/bin/`) if no process is running.

### 3.2 Configuration Management
- **Visual Editor**: Form-based editing for common `frpc` settings (server_addr, server_port, token).
- **Proxy Management**: Add, edit, and delete proxy rules (TCP, UDP, HTTP, HTTPS).
- **TOML/INI Support**: robust parsing and generating of configuration files.
- **Raw Editor**: Advanced mode to edit the configuration file directly as text.

### 3.3 Status & Control
- **Service Status**: Show if `frpc` is currently running, stopped, or erroring.
- **Service Control**: Start, Stop, and Restart the `frpc` service (support systemd).
- **Logs**: View real-time or recent logs from `frpc`.

## 4. User Flow
1. **Login/Connect**: User enters Remote IP, SSH Port, Username, Auth method.
2. **Dashboard**:
   - System connects via SSH.
   - Scans for `frpc`.
   - Displays "FRPC Detected at /path/to/config" or prompts to install/configure.
   - Shows current status (Online/Offline).
3. **Edit Config**:
   - User clicks "Edit Config".
   - Modifies proxy rules (e.g., "Add SSH mapping", "Add Web mapping").
   - Clicks "Save & Restart".
4. **System Action**:
   - Backend saves file via SSH.
   - Backend restarts `frpc` service.
   - Frontend updates status.

## 5. Non-Functional Requirements
- **Security**: SSH credentials should not be stored permanently unless requested (or stored securely).
- **Performance**: Quick connection and low-latency log streaming.
- **UI/UX**: Modern, clean interface (using Shadcn/UI).
