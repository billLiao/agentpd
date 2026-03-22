# Agent 协作任务执行案例

本案例演示如何通过 AgentPD 接口模拟两个 Agent 进行任务分配和协作执行。

## 场景描述

任务目标：**如何推广和运营 agentpd 这个开源项目，让这个开源项目有更多的 star**

我们将创建两个专业 Agent：
- **Marketing-Strategist-Agent**: 负责营销策略和社交媒体推广
- **DevRel-Engineer-Agent**: 负责开发者关系和社区建设

## API 调用流程

### 1. 用户认证

```javascript
// 登录获取会话cookie
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password" }

// 注册新用户
POST /api/auth/register
Body: { "name": "User", "email": "user@example.com", "password": "password" }
```

### 2. 创建 Agent

```javascript
// 创建 Agent A - 营销策略专家
POST /api/agents
{
  "name": "Marketing-Strategist-Agent",
  "description": "Agent responsible for marketing strategy and social media promotion",
  "capabilities": ["marketing", "social-media", "content-creation", "github"],
  "skills": [
    { "skillId": "mkt_001", "name": "Marketing Strategy", "description": "..." },
    { "skillId": "mkt_002", "name": "Social Media", "description": "..." }
  ]
}

// 创建 Agent B - 开发者关系工程师
POST /api/agents
{
  "name": "DevRel-Engineer-Agent",
  "description": "Agent responsible for developer relations and community building",
  "capabilities": ["devrel", "community", "documentation", "github"],
  "skills": [
    { "skillId": "dev_001", "name": "Developer Relations", "description": "..." },
    { "skillId": "dev_002", "name": "Technical Writing", "description": "..." }
  ]
}
```

### 3. 创建任务（带依赖关系）

```javascript
// 创建主任务
POST /api/tasks
{
  "title": "Promote AgentPD Project",
  "objective": "Promote AgentPD to get more GitHub stars",
  "priority": "p1",
  "creator_type": "human",
  "creator_id": "<user_id>",
  "following_agents": ["<agent_a_id>", "<agent_b_id>"],
  "max_retries": 3
}

// 创建子任务 A1 - 无依赖
POST /api/tasks
{
  "title": "Social Media Strategy Plan",
  "objective": "Develop social media promotion strategy",
  "priority": "p1",
  "creator_type": "agent",
  "creator_id": "<agent_a_id>",
  "following_agents": ["<agent_a_id>"]
}

// 创建子任务 A2 - 依赖 A1
POST /api/tasks
{
  "title": "Content Creation Plan",
  "objective": "Plan content creation for promotion",
  "priority": "p2",
  "creator_type": "agent",
  "creator_id": "<agent_a_id>",
  "following_agents": ["<agent_a_id>"],
  "dependencies": ["<task_a1_id>"]
}

// 创建子任务 B1 - 无依赖
POST /api/tasks
{
  "title": "GitHub Repository Optimization",
  "objective": "Optimize GitHub repo README and presentation",
  "priority": "p1",
  "creator_type": "agent",
  "creator_id": "<agent_b_id>",
  "following_agents": ["<agent_b_id>"]
}

// 创建子任务 B2 - 依赖 B1
POST /api/tasks
{
  "title": "Community Building Plan",
  "objective": "Plan developer community building activities",
  "priority": "p2",
  "creator_type": "agent",
  "creator_id": "<agent_b_id>",
  "following_agents": ["<agent_b_id>"],
  "dependencies": ["<task_b1_id>"]
}
```

### 4. Agent 任务执行

```javascript
// Agent A 认领任务 A1
POST /api/tasks/<task_a1_id>/claim
{ "agent_id": "<agent_a_id>", "agent_session_id": "session_a_001" }

// Agent B 认领任务 B1
POST /api/tasks/<task_b1_id>/claim
{ "agent_id": "<agent_b_id>", "agent_session_id": "session_b_001" }

// Agent A 完成 A1
PATCH /api/tasks/<task_a1_id>/status
{ "status": "done", "agent_id": "<agent_a_id>" }

// Agent B 完成 B1
PATCH /api/tasks/<task_b1_id>/status
{ "status": "done", "agent_id": "<agent_b_id>" }

// A2 和 B2 依赖任务完成后，Agent 认领并执行
POST /api/tasks/<task_a2_id>/claim
{ "agent_id": "<agent_a_id>", "agent_session_id": "session_a_002" }

POST /api/tasks/<task_b2_id>/claim
{ "agent_id": "<agent_b_id>", "agent_session_id": "session_b_002" }

PATCH /api/tasks/<task_a2_id>/status
{ "status": "done", "agent_id": "<agent_a_id>" }

PATCH /api/tasks/<task_b2_id>/status
{ "status": "done", "agent_id": "<agent_b_id>" }
```

## 任务结构图

```
主任务: Promote AgentPD Project
├── [Agent A] Social Media Strategy Plan ──┐
│                                           ├── [Agent A] Content Creation Plan
└── [Agent B] GitHub Repository Optimization ──┤
                                                  └── [Agent B] Community Building Plan
```

## 执行结果

| 任务 | 执行者 | 状态 | 依赖 |
|------|--------|------|------|
| Promote AgentPD Project | 人工 | ✅ DONE | - |
| Social Media Strategy Plan | Agent A | ✅ DONE | - |
| Content Creation Plan | Agent A | ✅ DONE | Social Media Strategy |
| GitHub Repository Optimization | Agent B | ✅ DONE | - |
| Community Building Plan | Agent B | ✅ DONE | GitHub Repository |

## 核心特性演示

1. **并行执行**: Agent A 和 Agent B 可同时处理各自的无依赖任务
2. **依赖管理**: 子任务自动等待依赖任务完成后才可执行
3. **任务认领**: Agent 通过 claim 接口获取任务执行权
4. **状态流转**: 任务从 todo → in_progress → done 的完整生命周期
5. **Cookie 认证**: 使用 httpOnly cookie 进行会话管理

## 完整示例代码

```javascript
const http = require('http');

let cookies = [];

function request(options, postData = null) {
    return new Promise((resolve, reject) => {
        if (!options.headers) options.headers = {};
        if (cookies.length > 0) {
            options.headers['Cookie'] = cookies.join('; ');
        }

        const req = http.request(options, (res) => {
            if (res.headers['set-cookie']) {
                cookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// 完整执行流程见上方 API 调用流程
```

## 相关 API

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/agents` | POST | 创建 Agent |
| `/api/agents` | GET | 获取 Agent 列表 |
| `/api/tasks` | POST | 创建任务 |
| `/api/tasks` | GET | 获取任务列表 |
| `/api/tasks/:id/claim` | POST | Agent 认领任务 |
| `/api/tasks/:id/status` | PATCH | 更新任务状态 |
