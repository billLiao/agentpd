import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const humans = sqliteTable('humans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isHuman: integer('is_human', { mode: 'boolean' }).notNull().default(true),
  role: text('role').notNull().default('developer'),
  createdAt: text('created_at').notNull(),
  lastActive: text('last_active'),
  accessibleAgents: text('accessible_agents').notNull().default('[]'),
  currentPerspective: text('current_perspective'),
  preferences: text('preferences').notNull().default('{}'),
  viewConfig: text('view_config').notNull().default('{}'),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  capabilities: text('capabilities').notNull().default('[]'),
  skills: text('skills').notNull().default('[]'),
  status: text('status').notNull().default('offline'),
  lastHeartbeat: text('last_heartbeat'),
  createdAt: text('created_at').notNull(),
  ownerId: text('owner_id'),
  viewConfig: text('view_config').notNull().default('{}'),
  metadata: text('metadata').notNull().default('{}'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  title: text('title').notNull(),
  objective: text('objective').notNull().default(''),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('p2'),
  creatorType: text('creator_type').notNull().default('human'),
  creatorId: text('creator_id').notNull(),
  followingAgents: text('following_agents').notNull().default('[]'),
  claimedAgent: text('claimed_agent'),
  assigneeAgentType: text('assignee_agent_type'),
  agentSessionId: text('agent_session_id'),
  contextRefs: text('context_refs').notNull().default('[]'),
  artifacts: text('artifacts').notNull().default('[]'),
  trace: text('trace').notNull().default('{}'),
  dependencies: text('dependencies').notNull().default('[]'),
  dependents: text('dependents').notNull().default('[]'),
  contextFromDeps: text('context_from_deps').notNull().default(''),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(0),
  stuck: integer('stuck').notNull().default(0),
  stuckAt: text('stuck_at'),
  createdAt: text('created_at').notNull(),
  claimedAt: text('claimed_at'),
  updatedAt: text('updated_at').notNull(),
});

export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  authorType: text('author_type').notNull(),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  content: text('content').notNull(),
  mentions: text('mentions').notNull().default('[]'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const authTokens = sqliteTable('auth_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tokenType: text('token_type').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
});

export const boardConfigs = sqliteTable('board_configs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  ownerType: text('owner_type').notNull(),
  columns: text('columns').notNull().default('[]'),
  filters: text('filters').notNull().default('{}'),
  sort: text('sort').notNull().default('{}'),
  updatedAt: text('updated_at').notNull(),
});

export const hitlRequests = sqliteTable('hitl_requests', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  triggerReason: text('trigger_reason').notNull(),
  urgency: text('urgency').notNull().default('medium'),
  payload: text('payload').notNull().default('{}'),
  humanResponse: text('human_response'),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
});
