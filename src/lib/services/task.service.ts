import { getClient } from '@/lib/db';
import { generateId } from '@/lib/auth/jwt';
import type { Task, TaskStatus, TaskComment, Artifact } from '@/lib/api/types';

const STUCK_THRESHOLD_MS = 30 * 60 * 1000;

function parseTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    parentId: (row.parent_id as string) || undefined,
    title: row.title as string,
    objective: row.objective as string,
    status: row.status as TaskStatus,
    priority: row.priority as Task['priority'],
    creatorType: row.creator_type as 'human' | 'agent',
    creatorId: row.creator_id as string,
    followingAgents: JSON.parse((row.following_agents as string) || '[]'),
    claimedAgent: (row.claimed_agent as string) || undefined,
    assigneeAgentType: (row.assignee_agent_type as string) || undefined,
    agentSessionId: (row.agent_session_id as string) || undefined,
    contextRefs: JSON.parse((row.context_refs as string) || '[]'),
    artifacts: JSON.parse((row.artifacts as string) || '[]'),
    trace: JSON.parse((row.trace as string) || '{}'),
    dependencies: JSON.parse((row.dependencies as string) || '[]'),
    dependents: JSON.parse((row.dependents as string) || '[]'),
    contextFromDeps: (row.context_from_deps as string) || '',
    retryCount: row.retry_count as number,
    maxRetries: row.max_retries as number,
    stuck: Boolean(row.stuck),
    stuckAt: (row.stuck_at as string) || undefined,
    createdAt: row.created_at as string,
    claimedAt: (row.claimed_at as string) || undefined,
    updatedAt: row.updated_at as string,
  };
}

export async function createTask(data: {
  title: string;
  objective?: string;
  priority?: string;
  creatorType: 'human' | 'agent';
  creatorId: string;
  followingAgents?: string[];
  dependencies?: string[];
  maxRetries?: number;
}): Promise<Task> {
  const client = await getClient();
  const now = new Date().toISOString();
  const taskId = generateId('task');

  await client.execute(
    `INSERT INTO tasks (id, parent_id, title, objective, status, priority, creator_type, creator_id, following_agents, claimed_agent, assignee_agent_type, agent_session_id, context_refs, artifacts, trace, dependencies, dependents, context_from_deps, retry_count, max_retries, stuck, stuck_at, created_at, claimed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      null,
      data.title,
      data.objective || '',
      'todo',
      data.priority || 'p2',
      data.creatorType,
      data.creatorId,
      JSON.stringify(data.followingAgents || []),
      null,
      null,
      null,
      '[]',
      '[]',
      '{}',
      JSON.stringify(data.dependencies || []),
      '[]',
      '',
      0,
      data.maxRetries || 0,
      0,
      null,
      now,
      null,
      now,
    ]
  );

  if (data.dependencies && data.dependencies.length > 0) {
    await updateDependentsForDependencies(data.dependencies, taskId);
  }

  return (await getTaskById(taskId))!;
}

async function updateDependentsForDependencies(dependencyIds: string[], dependentTaskId: string) {
  const client = await getClient();

  for (const depId of dependencyIds) {
    const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [depId]);
    if (result.rows && result.rows.length > 0) {
      const depTask = result.rows[0] as Record<string, unknown>;
      const currentDependents = JSON.parse((depTask.dependents as string) || '[]');
      if (!currentDependents.includes(dependentTaskId)) {
        await client.execute(
          `UPDATE tasks SET dependents = ? WHERE id = ?`,
          [JSON.stringify([...currentDependents, dependentTaskId]), depId]
        );
      }
    }
  }
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
  if (!result.rows || result.rows.length === 0) return null;
  return parseTaskRow(result.rows[0] as Record<string, unknown>);
}

export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE status = ?`, [status]);
  if (!result.rows) return [];
  return result.rows.map(row => parseTaskRow(row as Record<string, unknown>));
}

export async function getTasksByIds(taskIds: string[]): Promise<Task[]> {
  if (taskIds.length === 0) return [];
  const client = await getClient();
  const placeholders = taskIds.map(() => '?').join(',');
  const result = await client.execute(`SELECT * FROM tasks WHERE id IN (${placeholders})`, taskIds);
  if (!result.rows) return [];
  return result.rows.map(row => parseTaskRow(row as Record<string, unknown>));
}

export async function claimTask(taskId: string, agentId: string, agentSessionId?: string): Promise<{ success: boolean; error?: string; pendingDependencies?: string[] }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const task = result.rows[0] as Record<string, unknown>;

  if (task.status !== 'todo') {
    return { success: false, error: 'Task is not in todo status' };
  }

  const followingAgents = JSON.parse((task.following_agents as string) || '[]');
  if (followingAgents.length > 0 && !followingAgents.includes(agentId)) {
    return { success: false, error: 'Agent is not in following agents list' };
  }

  const dependencies = JSON.parse((task.dependencies as string) || '[]');
  const now = new Date().toISOString();

  if (dependencies.length > 0) {
    const placeholders = dependencies.map(() => '?').join(',');
    const depResult = await client.execute(`SELECT * FROM tasks WHERE id IN (${placeholders})`, dependencies);
    const pendingDeps = (depResult.rows || []).filter((t: Record<string, unknown>) => t.status !== 'done');

    if (pendingDeps.length > 0) {
      return {
        success: false,
        error: 'Dependencies not met',
        pendingDependencies: pendingDeps.map((t: Record<string, unknown>) => t.id as string),
      };
    }

    const contextFromDeps = await aggregateContextFromDependencies(dependencies);

    const updateResult = await client.execute(
      `UPDATE tasks SET status = 'in_progress', claimed_agent = ?, agent_session_id = ?, claimed_at = ?, updated_at = ?, context_from_deps = ? WHERE id = ? AND status = 'todo'`,
      [agentId, agentSessionId || null, now, now, contextFromDeps, taskId]
    );

    if (updateResult.rowsAffected === 0) {
      return { success: false, error: 'Task already claimed by another agent' };
    }
  } else {
    const updateResult = await client.execute(
      `UPDATE tasks SET status = 'in_progress', claimed_agent = ?, agent_session_id = ?, claimed_at = ?, updated_at = ? WHERE id = ? AND status = 'todo'`,
      [agentId, agentSessionId || null, now, now, taskId]
    );

    if (updateResult.rowsAffected === 0) {
      return { success: false, error: 'Task already claimed by another agent' };
    }
  }

  return { success: true };
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    objective?: string;
    priority?: string;
    followingAgents?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.objective !== undefined) {
    updates.push('objective = ?');
    values.push(data.objective);
  }
  if (data.priority !== undefined) {
    updates.push('priority = ?');
    values.push(data.priority);
  }
  if (data.followingAgents !== undefined) {
    updates.push('following_agents = ?');
    values.push(JSON.stringify(data.followingAgents));
  }

  if (updates.length === 0) {
    return { success: true };
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(taskId);

  await client.execute(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  return { success: true };
}

async function aggregateContextFromDependencies(dependencyIds: string[]): Promise<string> {
  const client = await getClient();
  let context = '';

  for (const depId of dependencyIds) {
    const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [depId]);
    if (result.rows && result.rows.length > 0) {
      const depTask = result.rows[0] as Record<string, unknown>;
      if (depTask.status === 'done') {
        const artifacts = JSON.parse((depTask.artifacts as string) || '[]');
        context += `上游任务 [${depTask.id}] ${depTask.title} 产出:\n`;
        if (artifacts.length > 0) {
          artifacts.forEach((artifact: Artifact) => {
            context += `- ${artifact.name}: ${artifact.url}\n`;
          });
        }
        if (depTask.context_from_deps) {
          context += `${depTask.context_from_deps}\n`;
        }
        context += '\n';
      }
    }
  }

  return context.trim();
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  agentId?: string
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const task = result.rows[0] as Record<string, unknown>;

  if (newStatus === 'in_progress' && task.status === 'todo') {
    const dependencies = JSON.parse((task.dependencies as string) || '[]');
    if (dependencies.length > 0) {
      const placeholders = dependencies.map(() => '?').join(',');
      const depResult = await client.execute(`SELECT * FROM tasks WHERE id IN (${placeholders})`, dependencies);
      const pendingDeps = (depResult.rows || []).filter((t: Record<string, unknown>) => t.status !== 'done');
      if (pendingDeps.length > 0) {
        return { success: false, error: 'Dependencies not met' };
      }
    }
  }

  const now = new Date().toISOString();

  if (newStatus === 'failed' && (task.max_retries as number) > 0) {
    const retryCount = (task.retry_count as number) + 1;
    if (retryCount < (task.max_retries as number)) {
      await client.execute(
        `UPDATE tasks SET status = ?, retry_count = ?, claimed_agent = ?, agent_session_id = ?, updated_at = ? WHERE id = ?`,
        ['todo', retryCount, null, null, now, taskId]
      );

      await createSystemComment(taskId, `自动重试：第 ${retryCount} 次尝试`);
      return { success: true };
    }
  }

  await client.execute(
    `UPDATE tasks SET status = ?, updated_at = ?, stuck = 0, stuck_at = NULL WHERE id = ?`,
    [newStatus, now, taskId]
  );

  if (newStatus === 'done') {
    await notifyDependentTasks(taskId);
  }

  return { success: true };
}

async function notifyDependentTasks(completedTaskId: string) {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [completedTaskId]);

  if (!result.rows || result.rows.length === 0) return;

  const task = result.rows[0] as Record<string, unknown>;
  const dependents = JSON.parse((task.dependents as string) || '[]');
  const artifacts = JSON.parse((task.artifacts as string) || '[]');

  for (const depId of dependents) {
    const depResult = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [depId]);
    if (depResult.rows && depResult.rows.length > 0) {
      const depTask = depResult.rows[0] as Record<string, unknown>;
      if (depTask.status !== 'done') {
        const newContext = `\n上游任务 [${task.id}] ${task.title} 已完成:\n`;
        const artifactContext = artifacts.length > 0
          ? artifacts.map((a: Artifact) => `- ${a.name}: ${a.url}`).join('\n')
          : '无产出';

        const updatedContext = ((depTask.context_from_deps as string) || '') + newContext + artifactContext + '\n';
        await client.execute(
          `UPDATE tasks SET context_from_deps = ? WHERE id = ?`,
          [updatedContext, depId]
        );
      }
    }
  }
}

export async function retryTask(taskId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const task = result.rows[0] as Record<string, unknown>;

  if (task.status !== 'failed' && task.status !== 'todo') {
    return { success: false, error: 'Task is not in failed or todo status' };
  }

  const now = new Date().toISOString();
  await client.execute(
    `UPDATE tasks SET status = ?, claimed_agent = NULL, agent_session_id = NULL, retry_count = 0, updated_at = ? WHERE id = ?`,
    ['todo', now, taskId]
  );

  await createSystemComment(taskId, `手动重试${reason ? `: ${reason}` : ''}`);

  return { success: true };
}

export async function getStuckTasks(): Promise<Task[]> {
  const client = await getClient();

  const result = await client.execute(
    `SELECT * FROM tasks WHERE status = 'in_progress' AND stuck = 0`
  );

  const stuckTasks: Task[] = [];
  const now = new Date();

  if (result.rows) {
    for (const task of result.rows) {
      const taskRecord = task as Record<string, unknown>;
      const updatedAt = new Date(taskRecord.updated_at as string);
      if (now.getTime() - updatedAt.getTime() > STUCK_THRESHOLD_MS) {
        await client.execute(
          `UPDATE tasks SET stuck = 1, stuck_at = ? WHERE id = ?`,
          [now.toISOString(), taskRecord.id as string]
        );
        const updatedRecord = { ...taskRecord, stuck: 1, stuck_at: now.toISOString() };
        stuckTasks.push(parseTaskRow(updatedRecord as Record<string, unknown>));
      }
    }
  }

  return stuckTasks;
}

export async function resolveStuckTask(
  taskId: string,
  action: 'retry' | 'release' | 'fail'
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const now = new Date().toISOString();

  switch (action) {
    case 'retry':
      await client.execute(
        `UPDATE tasks SET status = 'todo', claimed_agent = NULL, agent_session_id = NULL, stuck = 0, stuck_at = NULL, updated_at = ? WHERE id = ?`,
        [now, taskId]
      );
      await createSystemComment(taskId, '任务已重置为待认领（卡死解决）');
      break;

    case 'release':
      await client.execute(
        `UPDATE tasks SET stuck = 0, stuck_at = NULL, updated_at = ? WHERE id = ?`,
        [now, taskId]
      );
      await createSystemComment(taskId, '任务已释放（卡死解决）');
      break;

    case 'fail':
      await client.execute(
        `UPDATE tasks SET status = 'failed', stuck = 0, stuck_at = NULL, updated_at = ? WHERE id = ?`,
        [now, taskId]
      );
      await createSystemComment(taskId, '任务已标记为失败（卡死解决）');
      break;
  }

  return { success: true };
}

export async function getTaskDependencies(taskId: string): Promise<Task[]> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) return [];

  const task = result.rows[0] as Record<string, unknown>;
  const dependencies = JSON.parse((task.dependencies as string) || '[]');
  if (dependencies.length === 0) return [];

  const placeholders = dependencies.map(() => '?').join(',');
  const depResult = await client.execute(`SELECT * FROM tasks WHERE id IN (${placeholders})`, dependencies);
  if (!depResult.rows) return [];
  return depResult.rows.map(row => parseTaskRow(row as Record<string, unknown>));
}

export async function getTaskDependents(taskId: string): Promise<Task[]> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) return [];

  const task = result.rows[0] as Record<string, unknown>;
  const dependents = JSON.parse((task.dependents as string) || '[]');
  if (dependents.length === 0) return [];

  const placeholders = dependents.map(() => '?').join(',');
  const depResult = await client.execute(`SELECT * FROM tasks WHERE id IN (${placeholders})`, dependents);
  if (!depResult.rows) return [];
  return depResult.rows.map(row => parseTaskRow(row as Record<string, unknown>));
}

export async function addTaskComment(
  taskId: string,
  data: {
    authorType: 'human' | 'agent' | 'system';
    authorId: string;
    authorName: string;
    content: string;
    mentions?: string[];
    isSystem?: boolean;
  }
): Promise<TaskComment> {
  const client = await getClient();
  const now = new Date().toISOString();
  const commentId = generateId('comment');

  await client.execute(
    `INSERT INTO task_comments (id, task_id, author_type, author_id, author_name, content, mentions, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      taskId,
      data.authorType,
      data.authorId,
      data.authorName,
      data.content,
      JSON.stringify(data.mentions || []),
      data.isSystem ? 1 : 0,
      now,
    ]
  );

  await client.execute(`UPDATE tasks SET updated_at = ? WHERE id = ?`, [now, taskId]);

  return {
    id: commentId,
    taskId,
    authorType: data.authorType,
    authorId: data.authorId,
    authorName: data.authorName,
    content: data.content,
    mentions: data.mentions || [],
    isSystem: data.isSystem || false,
    createdAt: now,
  };
}

async function createSystemComment(taskId: string, content: string) {
  await addTaskComment(taskId, {
    authorType: 'system',
    authorId: 'system',
    authorName: 'System',
    content,
    isSystem: true,
  });
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM task_comments WHERE task_id = ?`, [taskId]);
  if (!result.rows) return [];
  return (result.rows as unknown as TaskComment[]).sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function updateTaskArtifact(
  taskId: string,
  artifact: Artifact
): Promise<{ success: boolean; error?: string }> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM tasks WHERE id = ?`, [taskId]);

  if (!result.rows || result.rows.length === 0) {
    return { success: false, error: 'Task not found' };
  }

  const task = result.rows[0] as Record<string, unknown>;
  const artifacts = JSON.parse((task.artifacts as string) || '[]');
  artifacts.push(artifact);

  const now = new Date().toISOString();

  await client.execute(
    `UPDATE tasks SET artifacts = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(artifacts), now, taskId]
  );

  return { success: true };
}
