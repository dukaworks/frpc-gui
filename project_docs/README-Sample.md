# 📚 Obsidian + OneDrive Sync for Ubuntu

> 一键配置Ubuntu上的Obsidian知识库同步方案  
> 让你的知识库在任何设备上无缝同步

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  
[![Ubuntu](https://img.shields.io/badge/Ubuntu-20.04+-E95420?logo=ubuntu)](https://ubuntu.com)  
[![OneDrive](https://img.shields.io/badge/OneDrive-0078D4?logo=microsoftonedrive)](https://onedrive.live.com)

---

## ✨ 特性

- 🚀 **一键安装**：全自动配置OneDrive同步
- 🔄 **双向同步**：本地编辑自动上传，云端更新自动下载
- 📝 **知识库管理**：命令行工具快速查询/添加笔记
- 🤖 **AI集成**：可与OpenClaw等AI助手配合使用
- ⚡ **systemd服务**：开机自启，后台自动同步
- 🛡️ **开源免费**：MIT许可证，可自由修改

---

## 🎯 适用场景

- ✅ Obsidian知识库在OneDrive，需要在Ubuntu上访问
- ✅ 多设备协作（Windows/Mac/Linux）
- ✅ 需要命令行管理知识库
- ✅ 想要AI助手帮助整理知识库

---

## 📦 安装

### 方式一：一键安装（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/obsidian-onedrive-sync.git
cd obsidian-onedrive-sync

# 2. 运行安装脚本
./install.sh

# 3. 按照提示完成OneDrive认证
```

### 方式二：手动安装

```bash
# 安装Snap（如果还没有）
sudo apt update
sudo apt install snapd

# 安装OneDrive客户端
sudo snap install onedrive --beta

# 首次认证
onedrive
# 按照提示：复制URL → 浏览器登录 → 授权 → 粘贴回调URL
```

---

## 🚀 快速开始

### 1. 启动同步服务

```bash
# 启动服务
systemctl --user start onedrive

# 查看状态
systemctl --user status onedrive

# 设置开机自启
systemctl --user enable onedrive
```

### 2. 手动同步

```bash
# 立即同步一次
onedrive --synchronize

# 查看详细日志
onedrive --synchronize --verbose
```

### 3. 使用知识库管理工具

```bash
# 搜索笔记
okm search "关键词"

# 添加笔记
okm add "笔记标题" "笔记内容"

# 查看统计
okm stats

# 列出所有笔记
okm list

# 强制同步
okm sync
```

---

## 📁 目录结构

```
~/OneDrive/                    # OneDrive同步根目录
├── Obsidian/                  # Obsidian知识库
│   ├── AI科技/               # 自动分类：AI相关
│   ├── 时政/                 # 自动分类：时政相关
│   ├── 教程/                 # 自动分类：教程相关
│   └── 未分类/               # 默认分类
├── Documents/                # 其他文档
└── Pictures/                 # 图片
```

---

## ⚙️ 配置

### 配置文件位置

```
~/.config/onedrive/config     # OneDrive配置
~/.config/systemd/user/       # systemd服务配置
```

### 自定义同步目录

编辑 `~/.config/onedrive/config`：

```bash
sync_dir = "/path/to/your/sync/dir"
skip_dir = "tmp|cache|node_modules"
skip_files = "*.tmp|~$*"
```

### 排除特定文件夹

```bash
# 编辑配置文件
nano ~/.config/onedrive/config

# 添加排除规则
skip_dir = "Personal|OldProjects"
```

---

## 🤖 与AI助手配合使用

本项目可与OpenClaw、Claude等AI助手配合使用：

### 查询知识库

```bash
# AI助手可以直接读取 ~/OneDrive/Obsidian/ 下的所有Markdown文件
# 支持自然语言查询：
# "帮我找找关于'中美关系'的笔记"
# "总结一下AI相关的文章"
```

### 自动添加笔记

```bash
# AI生成的内容可以自动保存到知识库
okm add "AI生成的标题" "AI生成的内容"
```

### 优化分类

```bash
# AI可以分析现有文件，建议更好的分类方案
# 然后自动移动/重命名文件
```

---

## 🛠️ 故障排除

### OneDrive无法启动

```bash
# 检查日志
journalctl --user -u onedrive -f

# 重新认证
onedrive --logout
onedrive
```

### 同步冲突

```bash
# 查看冲突文件
onedrive --display-sync-status

# 强制重新同步
onedrive --resync
```

### 服务无法启动

```bash
# 检查配置文件
onedrive --display-config

# 验证配置
onedrive --dry-run
```

---

## 📊 性能优化

### 大文件处理

```bash
# 在配置文件中添加
skip_size = "100MB"  # 跳过大于100MB的文件
```

### 选择性同步

```bash
# 只同步特定目录
onedrive --synchronize --single-directory 'Obsidian'
```

---

## 🔒 安全建议

1. **定期备份**：虽然OneDrive有云备份，仍建议定期本地备份
2. **敏感文件**：不要在知识库中存储密码、密钥等敏感信息
3. **访问控制**：确保OneDrive账号安全，启用两步验证

---

## 📝 更新日志

### v1.0.0 (2026-02-21)

- ✅ 初始版本发布
- ✅ 一键安装脚本
- ✅ 知识库管理工具（okm）
- ✅ systemd服务配置
- ✅ GitHub Actions配置

---

## 🤝 贡献

欢迎提交Issue和PR！

```bash
# Fork项目
git clone https://github.com/yourusername/obsidian-onedrive-sync.git

# 创建分支
git checkout -b feature/your-feature

# 提交更改
git commit -am 'Add some feature'

# 推送
git push origin feature/your-feature

# 创建Pull Request
```

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [abraunegg/onedrive](https://github.com/abraunegg/onedrive) - Linux OneDrive客户端
- [Obsidian](https://obsidian.md) - 强大的知识库工具
- [Microsoft OneDrive](https://onedrive.live.com) - 云存储服务

---

## 📮 联系方式

- 作者：🦞 龙虾
- 项目地址：https://github.com/yourusername/obsidian-onedrive-sync
- 问题反馈：https://github.com/yourusername/obsidian-onedrive-sync/issues

---

**让你的知识库在任何设备上无缝同步！** 🚀