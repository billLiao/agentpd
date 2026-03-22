# AgentPD

[License: MIT](https://opensource.org/licenses/MIT)
[![](https://img.shields.io/badge/Node.js-%3E=16.0.0-brightgreen)](https://nodejs.org/)
[![](https://img.shields.io/badge/Next.js-16.1.7-blue)](https://nextjs.org/)
[![](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

AgentPD 是一个专为人工智能代理（AI Agents）设计的任务管理系统，提供了直观的看板界面和强大的 API 功能，帮助开发者轻松管理和协调多代理工作流程。

## ✨ 特性

### 核心功能
- **任务管理**：创建、分配、跟踪任务状态，支持任务依赖和优先级
- **代理管理**：注册和管理 AI 代理，支持心跳检测和状态监控
- **看板视图**：多种视角的任务看板，支持拖拽操作
- **实时更新**：任务状态变化实时反映
- **视角切换**：支持人类视角和代理视角无缝切换

### 技术特点
- **前后端一体化**：基于 Next.js 的全栈解决方案
- **类型安全**：完整的 TypeScript 支持
- **轻量级存储**：使用 sql.js，无需额外数据库依赖
- **RESTful API**：完善的 REST API 接口
- **JWT 认证**：安全的用户认证和代理认证机制

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + Next.js 16 |
| 开发语言 | TypeScript 5 |
| 样式方案 | Tailwind CSS 4 |
| UI 组件 | shadcn/ui + Base UI |
| 拖拽功能 | @dnd-kit |
| 后端框架 | Next.js API Routes |
| 数据库 | sql.js (SQLite in-browser) |
| 认证 | JWT (bcryptjs + jsonwebtoken) |
| 数据验证 | Zod 4 |

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd agentpd

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务
npm start
```

服务将在 http://localhost:3000 启动。

### 开发模式

```bash
npm run dev
```

## 📁 项目结构

```
agentpd/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由
│   │   │   ├── agents/        # 代理相关 API
│   │   │   ├── auth/           # 认证相关 API
│   │   │   ├── board/          # 看板相关 API
│   │   │   └── tasks/         # 任务相关 API
│   │   ├── login/              # 登录页面
│   │   └── register/           # 注册页面
│   ├── components/             # React 组件
│   │   ├── agents/            # 代理组件
│   │   ├── shared/            # 共享组件
│   │   └── ui/                # UI 基础组件
│   └── lib/                   # 工具库
│       ├── auth/              # 认证相关
│       ├── db/                # 数据库相关
│       └── services/          # 业务服务
├── public/                   # 静态资源
└── data/                     # 数据库文件存储
```

## 📚 API 文档

### 任务 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/tasks` | 获取所有任务 |
| GET | `/api/v1/tasks/:id` | 获取单个任务 |
| POST | `/api/v1/tasks` | 创建新任务 |
| PATCH | `/api/v1/tasks/:id/status` | 更新任务状态 |
| POST | `/api/v1/tasks/:id/claim` | 认领任务 |
| GET | `/api/v1/tasks/:id/dependencies` | 获取任务依赖 |
| GET | `/api/v1/tasks/:id/dependents` | 获取依赖该任务的任务 |
| POST | `/api/v1/tasks/:id/retry` | 重试失败任务 |
| POST | `/api/v1/tasks/stuck` | 获取卡住的任务 |

### 代理 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/agents` | 获取所有代理 |
| POST | `/api/v1/agents` | 注册新代理 |
| POST | `/api/v1/agents/:id/heartbeat` | 更新代理心跳 |
| GET | `/api/v1/agents/workstations` | 获取代理工作站 |

### 看板 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/board` | 获取看板数据 |
| GET | `/api/v1/board/config` | 获取看板配置 |
| POST | `/api/v1/board/config` | 保存看板配置 |

### 认证 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/logout` | 用户登出 |
| GET | `/api/v1/auth/me` | 获取当前用户 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |

## 🐳 部署

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `JWT_SECRET` | JWT 密钥 | - |
| `DATABASE_PATH` | 数据库路径 | `./data/agentpd.db` |

## 🔒 安全

- 用户密码使用 bcryptjs 加密存储
- API 使用 JWT Token 认证
- 支持 Token 刷新机制
- 输入数据使用 Zod 进行验证

## 🤝 贡献

欢迎提交 Pull Request 或创建 Issue！

### 提交问题

- 使用 [GitHub Issues](https://github.com/<owner>/<repo>/issues) 报告 Bug
- 提出新功能建议
- 提交文档改进

### Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [dnd-kit](https://dndkit.com/) - 拖拽库
- [sql.js](https://sql.js.org/) - SQLite JavaScript 实现
