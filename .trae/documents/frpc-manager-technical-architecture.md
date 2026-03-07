# FRPC Manager - Technical Architecture

## 1. System Architecture
The application will be built as a full-stack web application.
- **Frontend**: React (SPA) for the user interface.
- **Backend**: Express.js server acting as a middleware between the Frontend and the Remote Server via SSH.

### High-Level Diagram
[Browser] <-> [Express Server (Local)] <--(SSH)--> [Remote Server (FRPC)]

## 2. Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Component Library**: Shadcn/UI (Radix UI based)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **SSH Client**: `ssh2` library for connecting to remote servers.
- **Config Parsing**: `@iarna/toml` (for TOML) and `ini` (for INI) parsing.
- **WebSocket**: `socket.io` (optional, or polling) for real-time log streaming.

## 3. Key Modules

### 3.1 SSH Manager (`/src/server/ssh`)
- Manages SSH connections.
- Executes commands (`exec`).
- Reads/Writes files (`sftp`).
- **Scanning Logic** (Multi-Strategy):
  1. **Docker**: `docker ps` to find container -> `docker inspect` to find config mount.
  2. **Systemd**: `systemctl list-units` to find service -> `systemctl show` to find ExecStart/config path.
  3. **Process**: `ps -eo pid,args` to find running process and config path (fallback).

### 3.2 Configuration Parser
- Converts TOML/INI string <-> JSON object for the frontend forms.

### 3.3 API Endpoints
- `POST /api/connect`: Validate SSH credentials and establish session.
- `GET /api/status`: Get frpc service status.
- `GET /api/config`: Read remote config file.
- `POST /api/config`: Write remote config file.
- `POST /api/service/:action`: Start/Stop/Restart service.

## 4. Data Flow
1. **Connect**: Frontend sends IP/User/Pass -> Backend -> SSH Connect -> Return Session ID (or keep session in memory/store).
2. **Scan**: Backend runs `ps` command via SSH -> Regex parse output -> Return path.
3. **Read**: Backend SFTP read file -> Parse TOML -> Return JSON.
4. **Save**: Frontend sends JSON -> Backend converts to TOML -> SFTP write file -> SSH exec `systemctl restart frpc`.

## 5. Directory Structure
```
/
├── src/
│   ├── client/          # Frontend React App
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── ...
│   ├── server/          # Backend Express App
│   │   ├── routes/
│   │   ├── services/    # SSH, Config logic
│   │   └── index.ts
│   └── shared/          # Shared Types
├── package.json
└── ...
```
