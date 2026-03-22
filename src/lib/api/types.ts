export type TaskStatus = 'todo' | 'in_progress' | 'waiting_for_human' | 'review' | 'done' | 'failed' | 'blocked';

export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type AgentStatus = 'online' | 'idle' | 'offline';

export interface Task {
  id: string;
  parentId?: string;
  title: string;
  objective: string;
  status: TaskStatus;
  priority: TaskPriority;
  creatorType: 'human' | 'agent';
  creatorId: string;
  followingAgents: string[];
  claimedAgent?: string;
  assigneeAgentType?: string;
  agentSessionId?: string;
  contextRefs: string[];
  artifacts: Artifact[];
  trace?: TaskTrace;
  dependencies: string[];
  dependents: string[];
  contextFromDeps: string;
  retryCount: number;
  maxRetries: number;
  stuck: boolean;
  stuckAt?: string;
  createdAt: string;
  claimedAt?: string;
  updatedAt: string;
}

export interface Artifact {
  type: 'file' | 'link' | 'code_snippet' | 'data_table';
  url: string;
  name: string;
}

export interface TaskTrace {
  traceId: string;
  tokenCost: number;
  summary: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorType: 'human' | 'agent' | 'system';
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface Human {
  id: string;
  name: string;
  email: string;
  isHuman: boolean;
  role: string;
  createdAt: string;
  lastActive?: string;
  accessibleAgents: string[];
  currentPerspective?: string;
  preferences: Record<string, unknown>;
  viewConfig: BoardViewConfig;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  skills: Skill[];
  status: AgentStatus;
  lastHeartbeat?: string;
  createdAt: string;
  ownerId?: string;
  viewConfig: BoardViewConfig;
  metadata: Record<string, unknown>;
}

export interface Skill {
  skillId: string;
  name: string;
  description: string;
}

export interface BoardPerspective {
  type: 'human' | 'agent';
  id: string;
  name: string;
}

export interface BoardStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
}

export interface BoardViewConfig {
  columns: ColumnConfig[];
  filters: BoardFilters;
  sort: BoardSort;
}

export interface ColumnConfig {
  status: TaskStatus;
  visible: boolean;
  order: number;
  collapsed?: boolean;
  highlight?: boolean;
}

export interface BoardFilters {
  priority: TaskPriority[];
  dateRange?: { from: string; to: string };
  agents: string[];
}

export interface BoardSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface AgentWorkstation {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  lastHeartbeat?: string;
  offlineDuration?: string;
  taskStats: {
    inProgress: number;
    todo: number;
    completedToday: number;
  };
  capabilities: string[];
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待处理',
  in_progress: '进行中',
  waiting_for_human: '等待人工',
  review: '审核中',
  done: '已完成',
  failed: '失败',
  blocked: '阻塞',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
};

export const BOARD_COLUMNS: TaskStatus[] = [
  'todo',
  'in_progress',
  'waiting_for_human',
  'review',
  'done',
];
