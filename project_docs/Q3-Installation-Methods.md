# 问题三：安装部署方案 (Q3)

为了方便用户部署，建议提供以下两种主流安装方式：

## 1. Systemd 一键安装脚本 (Linux)
适用于在 Linux 服务器或树莓派等设备上直接运行。

### 实现思路：
编写一个 Shell 脚本 (`install.sh`)，执行以下操作：
1.  **环境检查**: 检查是否安装 Node.js/npm（如果没有，脚本可尝试安装或提示用户）。
2.  **拉取代码/下载构建包**: 从 GitHub Release 下载编译好的后端源码包。
3.  **安装依赖**: 运行 `npm install --production`。
4.  **创建服务**: 生成 `/etc/systemd/system/frpc-gui.service` 文件。
    ```ini
    [Unit]
    Description=FRPC GUI Dashboard
    After=network.target

    [Service]
    Type=simple
    User=root
    WorkingDirectory=/opt/frpc-gui
    ExecStart=/usr/bin/npm start
    Restart=on-failure

    [Install]
    WantedBy=multi-user.target
    ```
5.  **启动服务**: `systemctl enable frpc-gui && systemctl start frpc-gui`。

**用户使用命令**:
`curl -fsSL https://raw.githubusercontent.com/your/repo/main/install.sh | sudo bash`

## 2. Docker 安装 (容器化)
这是最推荐的方式，环境隔离，不污染宿主机。

### Dockerfile 优化
需要编写一个多阶段构建的 Dockerfile，将前端构建产物和后端服务打包在一个镜像中。

### 启动命令 (docker run)
```bash
docker run -d \
  --name frpc-gui \
  -p 3001:3001 \
  -v /etc/frp:/etc/frp \  # 挂载配置目录（可选，视架构而定，见Q4分析）
  --restart always \
  ghcr.io/yourname/frpc-gui:latest
```

### Docker Compose
提供 `docker-compose.yml`：
```yaml
version: '3'
services:
  frpc-gui:
    image: ghcr.io/yourname/frpc-gui:latest
    container_name: frpc-gui
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data  # 持久化应用数据
    restart: always
```
