# FRPC GUI (0.1.5)

A modern, web-based GUI for configuring and managing FRPC (Fast Reverse Proxy Client).

## 功能
- SSH 连接并建立会话（`x-session-id`）
- 自动扫描 `frpc` 运行来源与配置文件路径
- Dashboard 查看状态与配置路径
- 配置读取与保存
- 可视化代理 CRUD（增删改查） + 源码编辑双模式

## 本地开发

安装依赖：
```bash
pnpm i
```

启动前后端（前端 Vite + 后端 Express）：
```bash
pnpm dev
```

默认：
- 前端：`http://localhost:5173`（如被占用会自动换端口）
- 后端：`http://localhost:3001`

## 目录结构
- `src/` 前端
- `api/` 后端（SSH、扫描、配置读写、服务控制）
