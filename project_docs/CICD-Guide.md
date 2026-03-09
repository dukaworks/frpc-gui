# CI/CD 流程入门指南

CI/CD (持续集成/持续部署) 是现代软件开发的核心实践。简单来说：
*   **CI (Continuous Integration)**: 每次提交代码后，自动运行测试、检查代码规范、构建项目，确保新代码没有破坏原有功能。
*   **CD (Continuous Deployment)**: 构建通过后，自动将软件发布到生产环境或生成安装包。

本项目使用 **GitHub Actions** 来实现 CI/CD。

## 1. 什么是 GitHub Actions?

GitHub Actions 是 GitHub 内置的自动化工具。你只需要在项目根目录下的 `.github/workflows/` 文件夹中创建 `.yml` 文件，定义好流程，GitHub 就会自动执行。

## 2. 核心概念

*   **Workflow (工作流)**: 一个自动化的过程，比如"构建并发布"。
*   **Event (触发事件)**: 什么情况下触发？比如 `push` (代码提交)、`pull_request` (合并请求)、`release` (发布版本)。
*   **Job (任务)**: 工作流包含的一个或多个任务，比如"运行测试"、"构建 Docker 镜像"。
*   **Step (步骤)**: 任务中的具体操作，比如"安装 Node.js"、"运行 npm install"。

## 3. 本项目的 CI/CD 配置示例

我们将在 `.github/workflows/` 下创建两个文件：

### A. `ci.yml` (代码检查与构建)
**目标**: 确保每次提交的代码是健康的。

```yaml
name: CI

# 触发条件: 当推送到 main 分支，或有 PR 提交到 main 分支时
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest # 运行环境: 最新版 Ubuntu

    steps:
    # 1. 拉取代码
    - uses: actions/checkout@v3

    # 2. 安装 Node.js
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    # 3. 安装依赖
    - name: Install Dependencies
      run: npm install

    # 4. 运行 Lint 检查 (代码规范)
    - name: Run Lint
      run: npm run lint

    # 5. 尝试构建 (确保能编译通过)
    - name: Build
      run: npm run build
```

### B. `release.yml` (自动发布)
**目标**: 当你在 GitHub 上打 Tag (如 `v1.0.0`) 时，自动构建 Docker 镜像并发布到 Docker Hub (或 GitHub Packages)。

```yaml
name: Docker Image CI

# 触发条件: 当推送 tag (以 v 开头) 时
on:
  push:
    tags:
      - 'v*'

jobs:
  push_to_registry:
    name: Push Docker image to GitHub Packages
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - name: Check out the repo
        uses: actions/checkout@v3

      - name: Log in to the Container registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

## 4. 如何开始?

1.  **创建目录**: 在项目根目录创建 `.github/workflows` 文件夹。
2.  **创建文件**: 将上述 YAML 内容保存为 `ci.yml`。
3.  **提交代码**: `git add .`, `git commit`, `git push`。
4.  **查看结果**: 打开 GitHub 仓库页面的 **"Actions"** 标签页，你会看到工作流正在运行。

## 5. 下一步建议

对于本项目 `frpc-gui`，建议优先配置 `ci.yml`。当你准备好发布 Docker 镜像时，再配置 `release.yml`。
