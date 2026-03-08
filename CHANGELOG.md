# Changelog

## 0.1.5
- **Server List UI 升级**：
  - 区分 **SSH**（Connection页创建）和 **Manual**（Server List页创建）两种来源，分别增加蓝色/橙色 Badge 标识。
  - Active 卡片采用绿色高亮 + Checkmark Badge，Inactive 卡片采用灰色低调风格。
  - 支持直接在 Server List 中对 SSH 连接进行 Edit 和 Delete（同步更新 Connection 列表）。
  - 为 SSH 连接增加 `token` 字段支持。
  - 统一 Delete 确认对话框样式（AlertDialog）。

## 0.1.4
- **Milestone: CRUD Completed**
- 修复 TOML 配置文件生成逻辑：
  - 移除 snake_case/camelCase 混合导致的重复字段
  - 修复数字格式化问题（移除 `8_000` 中的下划线）
  - 恢复 INI-style 的扁平化 Section 结构（`[proxy_name]` 而非 `[[proxies]]`）
- 优化 UI 空状态：Proxies 列表与 Server List 风格统一（Card + Icon + Action Button）
- 完善本地文件读写测试验证流程

## 0.1.3
- 优化 Proxies 列表 UI：Inline Badges
- 增加 Server List Profiles 管理
- 全局深色边框主题适配

## 0.1.0
- 修复前端启动白屏（`@iarna/toml` 浏览器端 `global is not defined`）
- 首页接入真实连接流程（SSH 连接 + 自动扫描）
- Dashboard 增加重扫（Rescan）与未检测到 frpc 提示
- 配置编辑器支持可视化代理 CRUD + 源码编辑双模式

