# 贡献指南

感谢您对 AgentPD 项目的关注！我们欢迎各种形式的贡献，包括但不限于代码提交、文档改进、Bug 报告和功能建议。

## 开始之前

在开始贡献之前，请确保：

1. 阅读并理解我们的 [行为准则](CODE_OF_CONDUCT.md)
2. 已安装 Node.js >= 16.0.0
3. 熟悉 React、Next.js 和 TypeScript

## 开发环境设置

```bash
# 克隆仓库
git clone <repository-url>
cd agentpd

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 分支管理

我们采用 Git Flow 分支策略：

- `main` - 生产环境分支，仅通过 PR 合并
- `develop` - 开发主干分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支
- `docs/*` - 文档分支

## 开发规范

### 代码风格

- 使用 TypeScript 进行开发
- 遵循 ESLint 规则
- 使用有意义的变量和函数命名
- 添加必要的注释说明复杂逻辑

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具变更

**示例:**

```
feat(tasks): 添加任务依赖管理功能

- 支持设置任务依赖关系
- 防止循环依赖
- 依赖任务未完成时阻塞当前任务

Closes #123
```

### Pull Request 流程

1. Fork 本仓库并创建特性分支
2. 确保代码通过所有 lint 和类型检查
3. 编写或更新相关测试
4. 更新文档（如有必要）
5. 提交 Pull Request 并描述变更内容
6. 等待代码审查并处理反馈

## 目录结构

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API 路由
│   ├── login/        # 登录页面
│   └── register/     # 注册页面
├── components/       # React 组件
│   ├── agents/       # 代理相关组件
│   ├── shared/       # 共享组件
│   └── ui/           # UI 基础组件
└── lib/              # 工具库
    ├── auth/          # 认证相关
    ├── db/            # 数据库相关
    └── services/      # 业务服务
```

## 测试

在提交前请确保运行测试：

```bash
# 运行 lint
npm run lint

# 运行类型检查
npm run typecheck
```

## 问题反馈

- 使用 GitHub Issues 报告 Bug
- 功能请求请使用 Feature Request 模板
- 提交前请搜索现有问题避免重复

## 许可证

通过贡献代码，您同意将您的作品按照 [MIT 许可证](LICENSE) 开源。

## 联系我们

如有问题或建议，请通过 GitHub Issues 与我们联系。
