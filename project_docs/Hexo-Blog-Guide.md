# Hexo 博客搭建与多人协作指南

本文档旨在指导如何在开源项目中集成和使用 Hexo 静态博客系统，以及多人协作时的最佳实践。

## 1. 环境搭建 (Installation)

Hexo 是一个快速、简洁且高效的博客框架，基于 Node.js 构建。

### 前置要求
*   **Node.js** (推荐 v18 或更高版本)
*   **Git**

### 安装步骤

1.  **全局安装 Hexo CLI**:
    ```bash
    npm install -g hexo-cli
    ```

2.  **初始化博客项目**:
    在项目根目录或者独立的 `blog/` 目录下执行：
    ```bash
    hexo init my-blog
    cd my-blog
    npm install
    ```

3.  **启动本地预览**:
    ```bash
    hexo server
    # 默认访问地址: http://localhost:4000
    ```

## 2. 主题选择 (Theme Selection)

Hexo 拥有丰富的主题生态。选择合适的主题可以极大提升阅读体验。

### 推荐主题

1.  **NexT** (经典、极简、插件丰富):
    *   适合技术文档、极简主义者。
    *   [GitHub 仓库](https://github.com/next-theme/hexo-theme-next)

2.  **Butterfly** (功能强大、美观):
    *   支持复杂的自定义配置、社交分享、评论系统。
    *   [GitHub 仓库](https://github.com/jenrey/hexo-theme-butterfly)

3.  **Keep** (现代化、轻量):
    *   设计现代，移动端友好。
    *   [GitHub 仓库](https://github.com/XPoet/hexo-theme-keep)

### 安装主题 (以 NexT 为例)

通常使用 Git Submodule 或 npm 安装：

```bash
# 方式一：Git Clone (推荐用于自定义修改较多的场景)
git clone https://github.com/next-theme/hexo-theme-next themes/next

# 方式二：npm 安装 (推荐用于保持清洁依赖)
npm install hexo-theme-next
```

修改 `_config.yml` 启用主题：
```yaml
theme: next
```

## 3. 日常使用 (Daily Usage)

### 常用命令

| 命令 | 简写 | 作用 | 说明 |
| :--- | :--- | :--- | :--- |
| `hexo new "My New Post"` | `hexo n` | 新建文章 | 在 `source/_posts` 生成 Markdown 文件 |
| `hexo server` | `hexo s` | 启动本地服务 | 实时预览修改 |
| `hexo generate` | `hexo g` | 生成静态文件 | 将 Markdown 编译为 HTML (在 `public/` 目录) |
| `hexo deploy` | `hexo d` | 部署到远程 | 推送到 GitHub Pages 或服务器 |
| `hexo clean` | - | 清理缓存 | 删除 `public/` 和 `db.json`，解决渲染异常 |

### 文章 Front-matter 规范

每篇 Markdown 文章的开头必须包含 Front-matter：

```markdown
---
title: Hexo 搭建指南
date: 2023-10-27 14:30:00
tags: [Hexo, Blog, Tutorial]
categories: [技术分享]
author: Trae
---
```

## 4. 多人协作注意事项 (Multi-user Collaboration)

当多个开发者共同维护一个博客时，需要遵循以下规范以避免冲突和资源丢失。

### 4.1. 资源文件管理 (图片/附件)

**强烈建议启用 Asset Folder 功能**。

1.  修改 `_config.yml`:
    ```yaml
    post_asset_folder: true
    ```
2.  效果：
    执行 `hexo new "MyPost"` 时，会同时创建一个同名的 `source/_posts/MyPost/` 文件夹。
3.  引用方式：
    将图片放入该文件夹，在文章中使用相对路径引用：
    ```markdown
    {% asset_img example.jpg This is an example image %}
    ```
    **优点**：文章与资源绑定，移动文章时资源不会丢失，且路径在首页和详情页都能正确解析。

### 4.2. Git 工作流

不要将 `public/` 目录提交到源码分支。通常使用双分支策略：

*   **`main` / `source` 分支**: 存放 Hexo 源码 (Markdown, Config, Themes)。**这是多人协作的分支**。
*   **`gh-pages` 分支**: 存放 `hexo g` 生成的静态网页 (HTML/CSS/JS)。

### 4.3. 自动化部署 (CI/CD) - **推荐**

为了避免 "A同学部署了覆盖了B同学的修改" 的问题，**严禁手动执行 `hexo d`**。应使用 GitHub Actions 自动部署。

**工作流**:
1.  成员编写文章 -> Push 到 `main` 分支。
2.  GitHub Actions 触发 -> 自动安装依赖 -> `hexo generate` -> 强制推送到 `gh-pages` 分支。

**示例 Workflow (`.github/workflows/blog-deploy.yml`)**:

```yaml
name: Deploy Hexo Blog

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true # 如果使用了 Git Submodule 主题

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Generate Static Files
        run: npx hexo generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          user_name: 'github-actions[bot]'
          user_email: 'github-actions[bot]@users.noreply.github.com'
```

### 4.4. 协作规范

1.  **拉取最新代码**: 每次写文章前，先 `git pull`。
2.  **统一配置**: 不要随意修改 `_config.yml` 或主题配置，重大修改需通过 Pull Request 评审。
3.  **作者署名**: 在 Front-matter 中添加 `author` 字段，明确文章归属。
