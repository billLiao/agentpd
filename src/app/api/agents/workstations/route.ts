import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const client = await getClient();
    const agentsResult = await client.execute(`SELECT * FROM agents`);

    const now = Date.now();
    const HEARTBEAT_TIMEOUT = 10 * 60 * 1000;

    const workstations = await Promise.all((agentsResult.rows || []).map(async (agent: Record<string, unknown>) => {
      const lastHeartbeat = agent.last_heartbeat
        ? new Date(agent.last_heartbeat as string).getTime()
        : 0;
      const isOnline = now - lastHeartbeat <= HEARTBEAT_TIMEOUT;

      const tasksResult = await client.execute(
        `SELECT * FROM tasks WHERE claimed_agent = ?`,
        [agent.id as string]
      );

      const agentTasks = tasksResult.rows || [];
      const inProgress = agentTasks.filter((t: Record<string, unknown>) => t.status === 'in_progress').length;
      const todo = agentTasks.filter((t: Record<string, unknown>) => t.status === 'todo').length;
      const today = new Date().toISOString().split('T')[0];
      const completedToday = agentTasks.filter(
        (t: Record<string, unknown>) => t.status === 'done' && (t.updated_at as string).startsWith(today)
      ).length;

      let status: 'online' | 'idle' | 'offline' = 'offline';
      if (isOnline) {
        status = inProgress > 0 ? 'online' : 'idle';
      }

      let offlineDuration: string | undefined;
      if (!isOnline && lastHeartbeat > 0) {
        offlineDuration = formatDuration(now - lastHeartbeat);
      }

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        status,
        lastHeartbeat: agent.last_heartbeat,
        offlineDuration,
        taskStats: {
          inProgress,
          todo,
          completedToday,
        },
        capabilities: typeof agent.capabilities === 'string' ? JSON.parse(agent.capabilities) : (agent.capabilities || []),
      };
    }));

    return NextResponse.json(workstations);
  } catch (error) {
    console.error('Get workstations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
