# 产品需求文档 (PRD)：AgentPD - 多 Agent 协作工作台

**文档状态**: MVP 规划中

**版本**: v1.4

**产品定位**: 面向通用知识工作者与多 Agent (如 OpenClaw) 协作的"黑灯工厂"中央控制台。

**核心理念**: 极致的 API 驱动、结构化产物回传、优雅的"人在环路 (HITL)"非阻塞协作。

> **协作备注**：开发过程中如遇核心状态机或底层数据结构的重大变更，请先与产品接口人 李盈 确认同步，避免上下游 Agent 调度逻辑断裂。

***

## 变更记录 (Changelog)

### v1.4 (2026-03-21)

**新增功能**：

1. **DAG 依赖管理**
   - 任务可设置前置依赖任务（`dependencies` 字段）
   - 只有当所有依赖任务状态为 `done` 时，当前任务才能流转到 `in_progress`
   - 支持任务依赖图可视化
   - 自动循环依赖检测，防止死锁
   - 上游任务完成后，自动将产出作为下游任务的上下文

2. **Agent 间实时通信（任务评论线程）**
   - Agent 可在任务下发表评论（`comments` 字段）
   - 每条评论触发 Webhook 通知任务的 `claimed_agent` 或 `following_agents`
   - 评论支持 `@mention` 其他 Agent
   - 完整的消息线程历史

3. **卡死任务检测 (Stuck Task Detection)**
   - 后台定时检测长时间未完成的任务
   - 判断规则：`in_progress` 状态超过 30 分钟无状态更新
   - 卡死任务自动标记 `stuck: true`，发送告警 Webhook
   - 看板 UI 高亮显示卡死任务

4. **自动重试机制**
   - 任务失败后可配置自动重试（`max_retries` 字段）
   - 重试次数耗尽后任务状态变为 `failed`
   - 每次重试记录系统评论，包含重试原因和尝试次数
   - 支持指数退避策略（可选）

5. **用户注册与认证**
   - 首次访问显示注册页面，完成初始用户注册
   - 注册后签发 JWT Token，用户端存储用于接口认证
   - 后续访问验证 Token 有效性，无效或缺失跳转登录页面
   - 支持人类用户的邮箱/密码认证
   - Token 默认有效期 7 天，支持 refresh Token 续期

**数据模型变更**：

- Task Entity 新增 `dependencies` 字段（数组，存储上游任务 ID）
- Task Entity 新增 `dependents` 字段（数组，自动计算下游任务 ID）
- Task Entity 新增 `retry_count` 字段
- Task Entity 新增 `max_retries` 字段
- Task Entity 新增 `stuck` 字段（布尔值）
- Task Entity 新增 `stuck_at` 字段（检测到卡死的时间戳）
- Task Entity 新增 `context_from_deps` 字段（上游任务的产出上下文）
- 新增 TaskComment Entity（任务评论实体）

**API 变更**：

- 新增 `GET /api/v1/tasks/:id/dependencies` - 获取任务依赖关系
- 新增 `GET /api/v1/tasks/:id/dependents` - 获取依赖此任务的下游任务
- 新增 `GET /api/v1/tasks/:id/comments` - 获取任务评论列表
- 新增 `POST /api/v1/tasks/:id/comments` - 添加任务评论
- 新增 `PATCH /api/v1/tasks/:id/retry` - 手动重试任务
- 新增 `GET /api/v1/tasks/stuck` - 获取卡死任务列表
- 修改 `POST /api/v1/tasks/:id/claim` - 检查依赖是否满足
- 修改 `PATCH /api/v1/tasks/:id/status` - 失败时触发重试逻辑

### v1.3 (2026-03-16)

**新增功能**：

1. **Agent 工位总览**
   - 人类用户可查看所有 Agent 的工位状态总览
   - 展示每个 Agent 的在线/空闲/离线状态
   - 离线判断规则：最后一次心跳超过 10 分钟
   - 显示离线 Agent 的离线时长
2. **Agent 任务统计**
   - 每个 Agent 工位卡片展示任务统计
   - 进行中任务数量
   - 待认领任务数量
   - 今日完成任务数量
3. **Agent 工作动画**
   - 在线且有进行中任务的 Agent 显示工作动画
   - 浮动粒子效果传达"机器正在工作"的生命感
   - 在线状态指示器呼吸脉冲动画
4. **Agent 心跳超时检测**
   - 后端定时检测 Agent 心跳超时（每分钟检查一次）
   - 超时自动将 Agent 状态更新为 offline
   - 前端每 30 秒自动刷新工位状态

**数据模型变更**：

- Agent Registry Entity 新增 `status` 字段（online/idle/offline）
- 新增 AgentWorkstation 接口用于工位展示

**API 变更**：

- 新增 `GET /api/v1/agents/workstations` - 获取所有 Agent 工位信息

### v1.2 (2026-03-16)

**新增功能**：

1. **个人看板视图**
   - 每个 Agent 和人类用户拥有独立的个人看板
   - 看板展示当前用户视角下的任务：创建的、认领的、参与的
   - 支持看板个性化配置（列显示、排序方式等）
2. **视角切换功能**
   - 人类用户可在 Web 端切换不同 Agent 身份查看视图
   - 切换后可看到该 Agent 视角下的任务和状态
   - 方便人类了解自己管理的所有 Agent 的工作进展
   - 切换时保持人类身份标识，操作记录仍归属人类

**数据模型变更**：

- 新增 Board View Config Entity（看板配置实体）
- Agent Registry Entity 新增 `view_config` 字段
- Human User Entity 新增 `accessible_agents` 字段（可访问的 Agent 列表）

**API 变更**：

- 新增 `GET /api/v1/board` - 获取当前视角的看板数据
- 新增 `POST /api/v1/board/config` - 保存看板配置
- 新增 `POST /api/v1/switch-perspective/{agent_id}` - 切换视角到指定 Agent

### v1.1 (2026-03-16)

**新增功能**：

1. **Agent 注册机制**
   - Agent 需要通过注册接口提供：名称、能力描述、已创建的技能列表
   - 支持查询当前已注册的 Agent 列表
2. **任务分配与认领机制**
   - 任务创建时可选择多个"跟进 Agent"（following\_agents）
   - Agent 通过心跳激活后可查看待认领任务
   - Agent 认领任务后，状态从 `todo` 流转到 `in_progress`
   - 认领后，跟进 Agent 自动转为认领 Agent（claimed\_agent）
3. **人类用户注册功能**
   - 支持人类用户注册，标记为 `is_human: true`
   - 人类可在 Web 端新建任务并分配给 Agent
4. **Web 端任务创建入口**
   - 新增"新建任务"按钮，支持人类用户创建任务
   - 创建时可选择分配的 Agent

**数据模型变更**：

- Task Entity 新增 `following_agents` 字段（数组）
- Task Entity 新增 `claimed_agent` 字段
- 新增 Agent Registry Entity
- 新增 Human User Entity

**API 变更**：

- 新增 `POST /api/v1/agents/register` - Agent 注册接口
- 新增 `GET /api/v1/agents` - 获取 Agent 列表
- 新增 `POST /api/v1/humans/register` - 人类用户注册接口
- 新增 `POST /api/v1/tasks/{id}/claim` - Agent 认领任务接口
- 修改 `POST /api/v1/tasks` - 支持 `following_agents` 参数

***

## 1. 核心状态机 (State Machine) 🚨&#x20;

这是整个系统的灵魂。Agent 的状态流转必须严格遵守此状态机，摒弃自然语言描述状态。

## 1.1 Task 状态流转图

- `todo`: 任务已创建（人类下发，或主 Agent 拆解生成的子任务）。
  - 此时任务已指定 `following_agents`（跟进的 Agent 列表）
  - 等待跟进 Agent 中的任意一个认领
  - **DAG 规则**：如果有依赖任务，必须所有依赖任务 `done` 才能认领
- `in_progress`: Agent 认领并开始执行（需绑定 `agent_session_id`）。
  - 认领后 `claimed_agent` 字段被填充
  - 状态从 `todo` 通过调用 `/api/v1/tasks/{id}/claim` 接口流转而来
  - **DAG 规则**：依赖任务未全部 `done` 时，禁止流转到此状态
  - **自动上下文**：进入此状态时，自动将上游任务的 `artifacts` 和 `context_from_deps` 聚合到 `context_refs`
- `waiting_for_human`: **(核心新增)** Agent 遇到阻碍（滑块验证、需要决策、高风险二次确认），挂起并等待人类介入。
- `review`: Agent 执行完毕，产出 Artifacts，等待人类或主 Agent 审核。
- `done`: 审核通过，任务闭环。
  - **DAG 规则**：完成时自动通知所有下游任务，触发其依赖检查
- `failed` / `blocked`: 彻底失败或因客观原因阻塞。
  - **自动重试**：如果 `retry_count < max_retries`，自动重置为 `todo` 并增加 `retry_count`

## 1.2 DAG 依赖管理规则

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAG 依赖管理流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Task A (task_001)          Task B (task_002)                  │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │ status: done    │        │ dependencies:   │                │
│  │ artifacts: [...]│───────▶│ [task_001]      │                │
│  └─────────────────┘        │ status: todo    │                │
│                             │ context_from_deps│◀── 自动填充    │
│                             │ : "Task A 产出:  │                │
│                             │  [...]"          │                │
│                             └─────────────────┘                │
│                                                                  │
│  规则：                                                           │
│  1. Task B 认领前，必须检查 Task A.status === 'done'            │
│  2. Task A 完成时，自动将 artifacts 聚合到 Task B.context_from_deps │
│  3. 循环依赖检测：创建/更新依赖时检测环，无法形成闭环             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**依赖检查时机**：

- 任务认领时（`/api/v1/tasks/{id}/claim`）
- 任务状态变更时

**上下文传递**：

- 当上游任务完成时，自动将其 `artifacts` 内容追加到下游任务的 `context_from_deps`
- 下游任务获取时可读取完整的依赖链上下文

## 1.3 任务认领流程

```
[人类/Agent创建任务] 
       ↓
[todo状态，指定following_agents]
       ↓
[Agent心跳激活，查看待认领任务]
       ↓
[Agent调用claim接口认领]
       ↓
[in_progress状态，claimed_agent确定]
```

**认领规则**：

- 只有在 `following_agents` 列表中的 Agent 才能认领该任务
- 认领是"先到先得"机制，第一个认领的 Agent 成为 `claimed_agent`
- 认领后其他跟进 Agent 收到通知，任务已被认领

***

## 2. 核心数据模型 (Data Schema)

请前端/后端模型直接参考以下结构进行 TypeScript Interface 或 ORM (如 Prisma) 的设计。

## 2.1 Agent 注册实体 (Agent Registry Entity)

```
{
  "id": "agent_001",
  "name": "Research_Agent",
  "description": "专注于信息检索、数据抓取和竞品分析的智能代理",
  "capabilities": [
    "web_scraping",
    "data_extraction",
    "competitive_analysis",
    "report_generation"
  ],
  "skills": [
    {
      "skill_id": "skill_001",
      "name": "财报数据抓取",
      "description": "从公开财务数据源抓取并结构化财报信息"
    },
    {
      "skill_id": "skill_002",
      "name": "竞品监控",
      "description": "持续监控指定竞品的动态并生成报告"
    }
  ],
  "status": "active", // 枚举：active, idle, offline
  "last_heartbeat": "2026-03-16T10:30:00Z",
  "created_at": "2026-03-01T08:00:00Z",
  "owner_id": "human_001", // 所属人类用户ID
  "view_config": {
    "columns": ["todo", "in_progress", "waiting_for_human", "review", "done"],
    "sort_by": "priority",
    "sort_order": "desc",
    "show_artifacts": true
  },
  "metadata": {
    "version": "1.2.0",
    "framework": "OpenClaw"
  }
}
```

## 2.2 人类用户实体 (Human User Entity)

```
{
  "id": "human_001",
  "name": "张三",
  "email": "zhangsan@example.com",
  "password_hash": "bcrypt_hash...", // 密码哈希（不存储明文）
  "is_human": true, // 标识为人类用户
  "role": "product_manager", // 枚举：product_manager, developer, reviewer, admin
  "created_at": "2026-03-01T08:00:00Z",
  "last_active": "2026-03-16T10:30:00Z",
  "accessible_agents": ["agent_001", "agent_002", "agent_003"], // 可访问的Agent列表
  "current_perspective": "human_001", // 当前视角（自己的ID或Agent ID）
  "preferences": {
    "notification_enabled": true,
    "default_agents": ["agent_001", "agent_002"]
  },
  "view_config": {
    "columns": ["todo", "in_progress", "waiting_for_human", "review", "done"],
    "sort_by": "created_at",
    "sort_order": "desc",
    "group_by": "agent",
    "show_artifacts": true
  }
}
```

## 2.2.1 用户认证实体 (User Auth Entity)

```
{
  "id": "auth_001",
  "user_id": "human_001", // 关联的用户ID
  "token_type": "access", // 枚举：access, refresh
  "token_hash": "sha256_hash...", // Token 的哈希值
  "expires_at": "2026-03-23T10:30:00Z", // 过期时间（access: 7天, refresh: 30天）
  "created_at": "2026-03-16T10:30:00Z",
  "last_used_at": "2026-03-21T08:00:00Z" // 最后使用时间
}
```

## 2.3 看板视图配置实体 (Board View Config Entity)

```
{
  "id": "viewconfig_001",
  "owner_id": "human_001", // 所属用户ID（人类或Agent）
  "owner_type": "human", // 枚举：human, agent
  "columns": [
    {
      "status": "todo",
      "visible": true,
      "order": 1,
      "collapsed": false
    },
    {
      "status": "in_progress",
      "visible": true,
      "order": 2,
      "collapsed": false
    },
    {
      "status": "waiting_for_human",
      "visible": true,
      "order": 3,
      "collapsed": false,
      "highlight": true // 高亮显示
    },
    {
      "status": "review",
      "visible": true,
      "order": 4,
      "collapsed": true
    },
    {
      "status": "done",
      "visible": true,
      "order": 5,
      "collapsed": true
    }
  ],
  "filters": {
    "priority": [], // 空数组表示全部
    "date_range": null,
    "agents": []
  },
  "sort": {
    "field": "priority",
    "order": "desc"
  },
  "updated_at": "2026-03-16T10:30:00Z"
}
```

## 2.4 任务实体 (Task Entity)

```
{
  "id": "task_10293",
  "parent_id": "epic_001",
  "title": "抓取并清洗竞品 Q3 财报数据",
  "objective": "从SEC官网获取指定公司财报，提取营收和利润，输出Excel",
  "status": "in_progress", // 严格遵循状态机
  "priority": "p1",
  "creator_type": "human", // 枚举：human, agent
  "creator_id": "human_001", // 创建者ID（人类或Agent）
  "following_agents": ["agent_001", "agent_002"], // 跟进的Agent列表（多选）
  "claimed_agent": "agent_001", // 认领的Agent（认领后从following_agents中确定）
  "assignee_agent_type": "Research_Agent", // 负责执行的 Agent 角色
  "agent_session_id": "sess_883a9", // 关联的具体运行实例
  "context_refs": ["url://sec.gov/...", "doc://internal_guideline_v2"],
  "artifacts": [
    {
      "type": "file", // 枚举：file, link, code_snippet, data_table
      "url": "s3://bucket/q3_data.xlsx",
      "name": "Q3_Revenue_Cleaned.xlsx"
    }
  ],
  "trace": {
    "trace_id": "tr_99120",
    "token_cost": 1450,
    "summary": "成功绕过基础反爬，提取了3张财务报表，已转换为结构化数据。"
  },
  "dependencies": ["task_10290", "task_10291"], // 上游依赖任务ID列表
  "dependents": ["task_10294", "task_10295"], // 下游任务ID列表（自动计算）
  "context_from_deps": "上游任务产出：竞品列表[...], 数据源配置{...}", // 自动聚合上游任务产出
  "retry_count": 0, // 当前重试次数
  "max_retries": 3, // 最大重试次数，0表示不重试
  "stuck": false, // 是否被检测为卡死
  "stuck_at": null, // 检测到卡死的时间戳
  "created_at": "2026-03-16T09:00:00Z",
  "claimed_at": "2026-03-16T09:15:00Z"
}
```

## 2.5 任务评论实体 (Task Comment Entity)

```
{
  "id": "comment_001",
  "task_id": "task_10293",
  "author_type": "agent", // 枚举：human, agent, system
  "author_id": "agent_001", // 评论作者ID
  "author_name": "Research_Agent", // 评论作者名称（用于显示）
  "content": "已完成数据抓取，正在进行数据清洗。@Data_Agent 准备好接收中间产物。",
  "mentions": ["agent_002"], // @mention 的 Agent ID 列表
  "is_system": false, // 是否为系统自动生成的评论（如重试记录）
  "created_at": "2026-03-16T10:00:00Z"
}
```

## 2.6 人在环路请求实体 (HITL Request Entity)

当 Task 状态变为 `waiting_for_human` 时，必须附带此对象，用于前端渲染交互卡片。

JSON

```
{
  "hitl_id": "req_5521",
  "task_id": "task_10293",
  "trigger_reason": "auth_required", // 枚举：auth_required (授权/验证码), direction_check (方向确认), risk_approval (风险阻断)
  "urgency": "high",
  "payload": {
    // 动态渲染内容，例如要求人类输入验证码
    "message": "检测到登录滑块验证，请协助完成。有效时间 2 分钟。",
    "snapshot_url": "s3://bucket/screenshots/captcha_99.png", 
    "action_required": "input_string" // 指导前端渲染一个输入框
  },
  "human_response": null // 人类处理后回写的字段
}
```

***

## 3. 核心 API 契约 (RESTful/Webhook)

供 OpenClaw 等 Agent 框架调用的标准接口。

## 3.1 Agent 注册与管理接口

- **`POST /api/v1/agents/register`**
  - Agent 注册接口，提供名称、能力描述、技能列表
  - 请求体：
    ```
    {
      "name": "Research_Agent",
      "description": "专注于信息检索、数据抓取和竞品分析的智能代理",
      "capabilities": ["web_scraping", "data_extraction"],
      "skills": [
        {"name": "财报数据抓取", "description": "从公开财务数据源抓取并结构化财报信息"}
      ],
      "metadata": {"version": "1.2.0", "framework": "OpenClaw"}
    }
    ```
  - 返回：注册成功的 Agent ID 和状态
- **`GET /api/v1/agents`**
  - 获取当前已注册的 Agent 列表
  - 支持过滤参数：`status`（active/idle/offline）、`capability`（按能力筛选）
  - 返回：Agent 列表，包含名称、能力描述、技能列表、状态等
- **`POST /api/v1/agents/{id}/heartbeat`**
  - Agent 心跳接口，用于激活状态
  - 心跳超时（默认 10 分钟）后状态变为 offline
- **`GET /api/v1/agents/workstations`**
  - 获取所有 Agent 工位总览信息
  - 返回：
    ```
    [
      {
        "id": "agent_001",
        "name": "Research_Agent",
        "description": "专注于信息检索和数据分析",
        "status": "online", // online | idle | offline
        "last_heartbeat": "2026-03-16T10:30:00Z",
        "offline_duration": null, // 离线时长，如 "2h 15m"
        "task_stats": {
          "in_progress": 3,
          "todo": 2,
          "completed_today": 8
        },
        "capabilities": ["web_scraping", "data_extraction"]
      }
    ]
    ```

## 3.2 人类用户与认证接口

- **`POST /api/v1/auth/register`**
  - 用户注册接口（首次使用）
  - 注册后自动签发 JWT Token
  - 请求体：
    ```
    {
      "name": "张三",
      "email": "zhangsan@example.com",
      "password": "secure_password123",
      "role": "product_manager"
    }
    ```
  - 返回：
    ```
    {
      "user": {
        "id": "human_001",
        "name": "张三",
        "email": "zhangsan@example.com",
        "role": "product_manager"
      },
      "access_token": "eyJhbGciOiJIUzI1NiIs...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
      "expires_in": 604800 // 7天（秒）
    }
    ```

- **`POST /api/v1/auth/login`**
  - 用户登录接口
  - 请求体：
    ```
    {
      "email": "zhangsan@example.com",
      "password": "secure_password123"
    }
    ```
  - 返回：登录成功返回 Token（格式同上）

- **`POST /api/v1/auth/refresh`**
  - 刷新 Token 接口
  - 请求体：
    ```
    {
      "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
    }
    ```
  - 返回：新签发的 access_token 和 refresh_token

- **`POST /api/v1/auth/logout`**
  - 登出接口，使 refresh_token 失效
  - 请求体：
    ```
    {
      "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
    }
    ```

- **`GET /api/v1/auth/me`**
  - 获取当前登录用户信息
  - 请求头：`Authorization: Bearer <access_token>`
  - 返回：当前用户信息

- **`POST /api/v1/humans/register`**
  - 人类用户注册接口（兼容旧版）
  - 请求体：
    ```
    {
      "name": "张三",
      "email": "zhangsan@example.com",
      "role": "product_manager"
    }
    ```
  - 返回：注册成功的人类用户 ID，自动标记 `is_human: true`

## 3.3 Agent 操作接口 (Agent Facing)

- **`POST /api/v1/tasks`**
  - 主 Agent 或人类调用，创建任务
  - 包含幂等键 `idempotency_key` 防止 IM 重发导致重复建单
  - 新增参数 `following_agents`：指定跟进的 Agent 列表（数组，可多选）
  - 新增参数 `dependencies`：指定上游依赖任务 ID 列表（数组）
  - 新增参数 `max_retries`：最大自动重试次数（默认 0）
  - 请求体：
    ```
    {
      "title": "抓取并清洗竞品 Q3 财报数据",
      "objective": "从SEC官网获取指定公司财报...",
      "priority": "p1",
      "creator_type": "human",
      "creator_id": "human_001",
      "following_agents": ["agent_001", "agent_002"],
      "dependencies": ["task_10290", "task_10291"],
      "max_retries": 3
    }
    ```
- **`POST /api/v1/tasks/{id}/claim`**
  - Agent 认领任务接口
  - 认领后：任务状态从 `todo` 变为 `in_progress`
  - 认领的 Agent 自动成为 `claimed_agent`
  - **DAG 检查**：如果存在未满足的依赖（`dependencies` 中的任务未全部 `done`），返回 400 错误
  - **上下文聚合**：认领成功后，自动将上游任务的 `artifacts` 聚合到当前任务的 `context_from_deps`
  - 请求体：
    ```
    {
      "agent_id": "agent_001",
      "agent_session_id": "sess_883a9"
    }
    ```
  - 错误响应（依赖未满足）：
    ```
    HTTP 400
    {
      "error": "dependencies_not_met",
      "message": "依赖任务未全部完成",
      "pending_dependencies": ["task_10290", "task_10291"]
    }
    ```
- **`PATCH /api/v1/tasks/{id}/status`**
  - Agent 变更状态。如果是更新为 `waiting_for_human`，必须在 body 中传入完整的 `HITL Request Entity`。
  - **DAG 检查**：如果是流转到 `in_progress`，检查依赖是否满足
  - **自动重试**：如果是 `failed` 状态且 `retry_count < max_retries`，自动重置为 `todo` 并增加 `retry_count`，发送系统评论
- **`POST /api/v1/tasks/{id}/artifacts`**
  - 结构化回传，挂载最终产物链接或文件。
- **`GET /api/v1/tasks/{id}/dependencies`**
  - 获取任务的依赖关系
  - 返回：
    ```
    {
      "task_id": "task_10293",
      "dependencies": [
        {
          "id": "task_10290",
          "title": "抓取竞品列表",
          "status": "done",
          "artifacts": [...]
        },
        {
          "id": "task_10291",
          "title": "配置数据源",
          "status": "in_progress"
        }
      ]
    }
    ```
- **`GET /api/v1/tasks/{id}/dependents`**
  - 获取依赖此任务的下游任务列表
  - 返回：
    ```
    {
      "task_id": "task_10290",
      "dependents": [
        {
          "id": "task_10293",
          "title": "清洗财报数据",
          "status": "todo"
        },
        {
          "id": "task_10294",
          "title": "生成分析报告",
          "status": "todo"
        }
      ]
    }
    ```
- **`GET /api/v1/tasks/{id}/comments`**
  - 获取任务的评论列表
  - 返回：
    ```
    {
      "task_id": "task_10293",
      "comments": [
        {
          "id": "comment_001",
          "author_type": "agent",
          "author_id": "agent_001",
          "author_name": "Research_Agent",
          "content": "已完成数据抓取，@Data_Agent 准备好接收中间产物。",
          "mentions": ["agent_002"],
          "is_system": false,
          "created_at": "2026-03-16T10:00:00Z"
        },
        {
          "id": "comment_002",
          "author_type": "system",
          "author_id": "system",
          "author_name": "System",
          "content": "自动重试：第 1 次尝试",
          "mentions": [],
          "is_system": true,
          "created_at": "2026-03-16T10:30:00Z"
        }
      ]
    }
    ```
- **`POST /api/v1/tasks/{id}/comments`**
  - 添加任务评论
  - 评论会触发 Webhook 通知 `claimed_agent` 和 `following_agents`
  - 请求体：
    ```
    {
      "author_type": "agent",
      "author_id": "agent_001",
      "author_name": "Research_Agent",
      "content": "已完成数据抓取，@Data_Agent 准备好接收中间产物。",
      "mentions": ["agent_002"]
    }
    ```
- **`PATCH /api/v1/tasks/{id}/retry`**
  - 手动重试失败任务
  - 请求体：
    ```
    {
      "reason": "修复了数据源问题"
    }
    ```
  - 返回：更新后的任务状态
- **`GET /api/v1/tasks/stuck`**
  - 获取所有卡死任务列表
  - 判断规则：`in_progress` 状态超过 30 分钟无状态更新
  - 返回：
    ```
    {
      "stuck_tasks": [
        {
          "id": "task_10293",
          "title": "抓取并清洗竞品 Q3 财报数据",
          "claimed_agent": "agent_001",
          "stuck_at": "2026-03-16T11:00:00Z",
          "duration": "45m"
        }
      ]
    }
    ```
- **`POST /api/v1/tasks/{id}/resolve-stuck`**
  - 解决卡死任务（人类介入）
  - 请求体：
    ```
    {
      "action": "retry", // 或 "release"（释放给其他Agent）、"fail"（标记失败）
      "reason": "数据源超时，手动重试"
    }
    ```

## 3.4 人类协作事件总线 (Human Facing -> Webhook)

- 当人类在 UI 上点击"通过验证"、"驳回并修改大纲"时，AgentPD 需要向 OpenClaw 预设的 Webhook URL 推送事件：

  JSON
  ```
  POST https://openclaw-instance/webhook/hitl_resolve
  {
    "event": "human_action_resolved",
    "task_id": "task_10293",
    "action_taken": "approved",
    "injected_context": "验证码为 8291A，请继续。" // 人类提供的破局信息
  }
  ```

## 3.5 看板与视角切换接口

- **`GET /api/v1/board`**
  - 获取当前视角的看板数据
  - 根据当前用户身份（人类或Agent）返回对应的任务列表
  - 支持查询参数：`status`、`priority`、`date_from`、`date_to`
  - 返回：
    ```
    {
      "perspective": {
        "type": "human", // 或 "agent"
        "id": "human_001",
        "name": "张三"
      },
      "tasks": {
        "todo": [...],
        "in_progress": [...],
        "waiting_for_human": [...],
        "review": [...],
        "done": [...]
      },
      "stats": {
        "total": 25,
        "by_status": {"todo": 5, "in_progress": 8, ...},
        "by_priority": {"p0": 2, "p1": 10, ...}
      }
    }
    ```
- **`POST /api/v1/board/config`**
  - 保存看板配置（列显示、排序、筛选等）
  - 请求体：
    ```
    {
      "columns": [
        {"status": "todo", "visible": true, "order": 1},
        {"status": "in_progress", "visible": true, "order": 2}
      ],
      "sort": {"field": "priority", "order": "desc"},
      "filters": {"priority": ["p0", "p1"]}
    }
    ```
- **`POST /api/v1/switch-perspective/{agent_id}`**
  - 切换视角到指定 Agent（仅人类用户可用）
  - 切换后，看板展示该 Agent 视角下的任务
  - 返回：切换后的视角信息和看板数据
  - 请求体：
    ```
    {
      "agent_id": "agent_001"
    }
    ```
  - 返回：
    ```
    {
      "previous_perspective": {"type": "human", "id": "human_001"},
      "current_perspective": {"type": "agent", "id": "agent_001", "name": "Research_Agent"},
      "board_data": {...}
    }
    ```
- **`POST /api/v1/reset-perspective`**
  - 重置视角回到人类自身视角
  - 返回：重置后的视角信息和看板数据
- **`GET /api/v1/perspective/accessible-agents`**
  - 获取当前人类可访问的 Agent 列表（用于视角切换下拉框）
  - 返回：
    ```
    {
      "agents": [
        {"id": "agent_001", "name": "Research_Agent", "status": "active"},
        {"id": "agent_002", "name": "QA_Agent", "status": "idle"}
      ]
    }
    ```

***

## 4. 前端 UI/UX 规范与 Vibe Coding 指南

此部分为前端样式指引。目标是打造极简、克制、无压力的现代工具体验。

## 4.1 视觉语言基调 (Apple-style Minimalism)

- **色彩与层级**：完全摒弃传统后台的深色硬边框。使用大面积留白（或深色模式下的纯黑背景），通过**卡片的毛玻璃模糊效果 (Backdrop-filter: blur)** 和**微投影 (Drop shadow)** 区分 Z 轴空间层级。
- **排版 (Typography)**：无衬线字体为主（San Francisco / Inter），利用字重（Font-weight）建立信息层级，减少使用不同字号。
- **动态反馈**：任务处于 `in_progress` 时，卡片边缘提供极其微弱的脉冲呼吸动画（Breathing glow），传达“机器正在思考/工作”的生命感，避免人类焦虑。

## 4.2 核心视图布局

1. **左侧面板 (The Chat/Input Column)**：
   - 类似 iMessage 的极简输入流。支持 Markdown 渲染。
   - 人类在此进行 Vibe Coding 式的模糊输入："帮我调研一下最近做 A2A 网络的初创公司"。
   - 系统后台自动将其解析为右侧看板的具体 Epic 和 Tasks。
   - **新建任务按钮**：顶部显眼位置提供"+"按钮，点击弹出任务创建表单
     - 表单字段：标题、目标描述、优先级、跟进 Agent 选择（多选下拉，数据来自 `/api/v1/agents`）
     - 创建成功后自动跳转到任务详情
2. **右侧/主面板 (The Orchestration Board)**：
   - **Agent 泳道视图**：横向按状态机（Todo, In Progress, Waiting, Review, Done）排列，纵向按 Agent 角色（Research, QA, Data）分组。
   - **高亮拦截 (HITL)**：所有处于 `waiting_for_human` 状态的卡片自动置顶，并有视觉高亮（如柔和的橙色描边），点击直接在右侧弹出抽屉 (Drawer) 展示 `HITL Request Entity` 中的拦截画面（如验证码截图或大纲文本）。
   - **待认领任务区**：`todo` 状态的任务卡片显示"待认领"标签，Agent 可在心跳激活后看到并认领
3. **详情与审计抽屉 (Audit Drawer)**：
   - 点击任意卡片划出。
   - 内容全面支持 Markdown 渲染（PRD、报告内容）。
   - 底部折叠显示 **Trace (决策链路)**：Token 消耗、调用的外部 Tool 记录。平时默认收起，保持界面清爽。

## 4.3 Agent 列表与选择组件

- **Agent 选择器**：任务创建时的多选组件
  - 展示已注册的 Agent 列表，包含名称、能力描述、当前状态
  - 支持按能力筛选
  - 支持多选，选中的 Agent 作为 `following_agents`
- **Agent 状态指示器**：
  - 🟢 active：在线且活跃
  - 🟡 idle：在线但空闲
  - ⚫ offline：离线

## 4.4 任务认领交互

- **Agent 视角**：
  - 心跳激活后，在"待认领"区域看到分配给自己的任务
  - 点击"认领"按钮，任务状态变为 `in_progress`
  - 认领后任务卡片移入该 Agent 的"进行中"泳道
- **人类视角**：
  - 可查看任务的 `following_agents` 和 `claimed_agent`
  - 认领前显示"待认领"，认领后显示认领 Agent 名称

## 4.5 个人看板与视角切换

### 4.5.1 个人看板视图

每个用户（人类或Agent）拥有独立的个人看板，展示当前视角下的任务：

- **人类看板**：
  - 显示：自己创建的任务、分配给自己管理的Agent的任务、需要自己审核的任务
  - 支持按Agent分组查看
  - 支持看板个性化配置
- **Agent 看板**：
  - 显示：分配给自己的任务（`following_agents` 包含自己）、自己认领的任务（`claimed_agent` 是自己）
  - 按状态分列展示
  - 突出显示需要处理的任务

### 4.5.2 视角切换功能

人类用户可在 Web 端切换不同 Agent 身份查看视图：

- **视角切换器**：
  - 位置：顶部导航栏右侧
  - 样式：下拉选择器，显示当前视角名称和状态指示器
  - 选项：
    - "我的视角"（默认，人类自身）
    - 分隔线
    - Agent 列表（按状态排序：active > idle > offline）
- **切换后效果**：
  - 看板标题变为 "Research\_Agent 的看板"
  - 任务列表展示该 Agent 视角下的内容
  - 顶部显示提示条："您正在以 Research\_Agent 身份查看"
  - 操作按钮保持可用（新建任务等），但操作记录归属人类
- **视角标识**：
  - 🧑 人类视角
  - 🤖 Agent 视角

### 4.5.3 看板统计面板

在看板顶部或侧边显示统计信息：

```
┌─────────────────────────────────────────┐
│ 当前视角: 张三 (人类)                    │
├─────────────────────────────────────────┤
│ 任务统计:                               │
│   待处理: 5   进行中: 8   等待中: 2      │
│   待审核: 3   已完成: 12                 │
├─────────────────────────────────────────┤
│ Agent 状态:                              │
│   🟢 Research_Agent (3个任务)            │
│   🟡 QA_Agent (2个任务)                  │
│   ⚫ Data_Agent (离线)                   │
└─────────────────────────────────────────┘
```

### 4.5.4 看板配置面板

点击看板右上角"设置"图标，弹出配置面板：

- **列配置**：选择显示哪些状态列，调整顺序
- **排序配置**：按优先级、创建时间、更新时间排序
- **筛选配置**：按优先级、日期范围、Agent 筛选
- **视图保存**：配置自动保存到用户配置中

### 4.5.5 Agent 工位总览视图

人类用户可查看所有 Agent 的工位状态总览，类似"一排工位"的可视化展示：

- **入口**：看板顶部"工位"按钮，点击切换到工位总览视图
- **布局**：网格布局展示所有 Agent 工位卡片

#### 工位卡片设计

```
┌────────────────────────────────────┐
│  🟢 在线                           │  ← 状态指示器（呼吸脉冲动画）
│                                    │
│  ┌────┐  Research_Agent            │  ← Agent 头像 + 名称
│  │ R  │  专注于信息检索和数据分析    │
│  └────┘                            │
│                                    │
│  ┌──────┬──────┬──────┐            │  ← 任务统计
│  │  3   │  2   │  8   │            │
│  │进行中│待认领│今日完成│            │
│  └──────┴──────┴──────┘            │
│                                    │
│  [数据抓取] [竞品分析] [报告生成]    │  ← 能力标签
└────────────────────────────────────┘
```

#### 状态判断规则

| 状态    | 条件                  | 视觉效果          |
| ----- | ------------------- | ------------- |
| 🟢 在线 | 最后心跳 ≤ 10 分钟且有进行中任务 | 绿色边框 + 浮动粒子动画 |
| 🟡 空闲 | 最后心跳 ≤ 10 分钟但无进行中任务 | 黄色边框          |
| ⚫ 离线  | 最后心跳 > 10 分钟        | 灰色边框 + 显示离线时长 |

#### 工作动画效果

在线且有进行中任务的 Agent 显示工作动画：

- 四个彩色粒子（蓝、紫、绿、黄）在卡片边缘浮动
- 在线状态指示器有呼吸脉冲动画
- 传达"机器正在工作"的生命感

#### 离线时长显示

离线 Agent 卡片底部显示：

```
⏰ 离线 2h 15m
```

#### 自动刷新

- 前端每 30 秒自动刷新工位状态
- 后端每分钟检查心跳超时并更新状态

### 4.5.6 DAG 依赖可视化

任务卡片和详情页显示依赖关系：

#### 任务卡片依赖标识

```
┌────────────────────────────────────┐
│ 🔗 依赖: 2 个任务                  │  ← 依赖数量标识
├────────────────────────────────────┤
│                                    │
│  抓取并清洗竞品 Q3 财报数据         │
│                                    │
│  [P1] [Research_Agent] [🔗 2]      │  ← 依赖任务数量徽章
│                                    │
└────────────────────────────────────┘
```

#### 依赖详情面板

在任务详情抽屉中显示依赖关系图：

```
┌─────────────────────────────────────────────────────────┐
│                    依赖关系                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │ 🔗 task_001  │─────▶│  当前任务     │                │
│  │ ✅ 已完成     │      │  task_10293  │                │
│  └──────────────┘      └──────┬───────┘                │
│                                │                         │
│  ┌──────────────┐             │                        │
│  │ 🔗 task_002  │─────────────┘                        │
│  │ ⏳ 进行中     │                                      │
│  └──────────────┘                                      │
│                                                          │
│  ─────────────────────────────────────                  │
│  📎 上游产出上下文:                                      │
│  "竞品列表: [阿里, 京东, 拼多多]                        │
│   数据源配置: {api_key: xxx}"                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.5.7 任务评论线程

#### 评论入口

任务详情抽屉底部显示评论入口：

```
┌─────────────────────────────────────────────────────────┐
│                    💬 讨论 (3)                          │  ← 评论数量
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🤖 Research_Agent          10:00                  ││
│  │                                                    ││
│  │ 已完成数据抓取，@Data_Agent 准备好接收中间产物。    ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ⚙️ System                    10:30                 ││
│  │                                                    ││
│  │ 🔄 自动重试：第 1 次尝试                          ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 输入评论...                              [发送]   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### @mention 支持

输入框支持 `@` 触发 Agent 提及：

```
┌─────────────────────────────────────────────────────────┐
│ @Data_Agent 准备好了吗？                     [发送]   │
├─────────────────────────────────────────────────────────┤
│ 提及建议:                                              │
│  ┌────────────────────────┐                           │
│  │ 🤖 Data_Agent          │  ← 下拉建议列表            │
│  │ 🤖 QA_Agent            │                           │
│  │ 🧑 张三 (你)           │                           │
│  └────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

### 4.5.8 卡死任务高亮

卡死任务在看板中突出显示：

```
┌────────────────────────────────────┐
│ ⚠️ 卡死警告                         │  ← 红色警告标识
├────────────────────────────────────┤
│                                    │
│  🔴 抓取并清洗竞品 Q3 财报数据      │  ← 红色边框高亮
│                                    │
│  [P1] [Research_Agent] [⚠️ 卡死]   │
│  ⏱️ 进行中 45 分钟                  │
│                                    │
└────────────────────────────────────┘
```

#### 卡死任务解决面板

点击卡死任务弹出解决方案选项：

```
┌─────────────────────────────────────────────────────────┐
│                    ⚠️ 任务卡死                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  任务 "抓取并清洗竞品 Q3 财报数据" 已进行中超过 45 分钟。│
│                                                          │
│  当前执行者: Research_Agent                             │
│  最后活动时间: 2026-03-16 10:15                        │
│                                                          │
│  选择解决方案:                                          │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🔄 重试任务                                         ││
│  │    将任务重置为待认领，让其他 Agent 处理            ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🔓 释放任务                                         ││
│  │    移除当前 Agent，保留进行中状态                   ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ❌ 标记失败                                         ││
│  │    将任务状态设为 failed                            ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  [取消]                              [确认操作]          │
└─────────────────────────────────────────────────────────┘
```

### 4.5.9 重试状态显示

任务卡片显示重试信息：

```
┌────────────────────────────────────┐
│ 🔄 重试中 (2/3)                    │  ← 重试进度标识
├────────────────────────────────────┤
│                                    │
│  抓取并清洗竞品 Q3 财报数据         │
│                                    │
│  [P1] [Research_Agent] [🔄 2/3]    │
│  ⚠️ 上次失败: 数据源超时            │
│                                    │
└────────────────────────────────────┘
```

### 4.5.10 任务创建/编辑 - 新增字段

任务创建弹窗新增依赖和重试配置：

```
┌─────────────────────────────────────────────────────────┐
│                    新建任务                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  标题: [________________________________]               │
│                                                          │
│  目标描述:                                               │
│  [________________________________________________]    │
│                                                          │
│  优先级:  ( P0  ● P1  ○ P2  ○ P3 )                     │
│                                                          │
│  跟进 Agent:  [Research_Agent ×] [QA_Agent ×]  [+添加]  │
│                                                          │
│  ───────────────────────────────────────                  │
│                                                          │
│  ⚙️ 高级设置 (点击展开)                                   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 上游依赖:                                           ││
│  │  [task_10290: 抓取竞品列表 ×]                      ││
│  │  [task_10291: 配置数据源 ×]                        ││
│  │  [+ 添加依赖任务]                                   ││
│  │                                                     ││
│  │ 自动重试:  ○ 关闭  ● 启用                          ││
│  │ 最大重试次数: [3]                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│              [取消]              [创建任务]              │
└─────────────────────────────────────────────────────────┘
```

