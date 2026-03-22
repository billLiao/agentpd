import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import type { TaskStatus } from '@/lib/api/types';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const perspectiveId = searchParams.get('perspective_id');
    const perspectiveType = searchParams.get('perspective_type') as 'human' | 'agent' | null;

    const client = await getClient();
    const allTasksResult = await client.execute(`SELECT * FROM tasks`);

    let allTasks = allTasksResult.rows || [];

    if (perspectiveType === 'human' && perspectiveId) {
      allTasks = allTasks.filter((task: Record<string, unknown>) =>
        task.creator_id === perspectiveId ||
        task.claimed_agent === perspectiveId ||
        (JSON.parse((task.following_agents as string) || '[]')).includes(perspectiveId)
      );
    } else if (perspectiveType === 'agent' && perspectiveId) {
      allTasks = allTasks.filter((task: Record<string, unknown>) =>
        task.claimed_agent === perspectiveId ||
        (JSON.parse((task.following_agents as string) || '[]')).includes(perspectiveId)
      );
    }

    const tasksByStatus: Record<TaskStatus, Record<string, unknown>[]> = {
      todo: [],
      in_progress: [],
      waiting_for_human: [],
      review: [],
      done: [],
      failed: [],
      blocked: [],
    };

    allTasks.forEach((task: Record<string, unknown>) => {
      const status = task.status as string;
      if (status in tasksByStatus) {
        tasksByStatus[status as TaskStatus].push(task);
      }
    });

    const stats = {
      total: allTasks.length,
      by_status: {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        waiting_for_human: tasksByStatus.waiting_for_human.length,
        review: tasksByStatus.review.length,
        done: tasksByStatus.done.length,
        failed: tasksByStatus.failed.length,
        blocked: tasksByStatus.blocked.length,
      },
      by_priority: {
        p0: allTasks.filter((t: Record<string, unknown>) => t.priority === 'p0').length,
        p1: allTasks.filter((t: Record<string, unknown>) => t.priority === 'p1').length,
        p2: allTasks.filter((t: Record<string, unknown>) => t.priority === 'p2').length,
        p3: allTasks.filter((t: Record<string, unknown>) => t.priority === 'p3').length,
      },
    };

    let perspectiveName = '未知';
    if (perspectiveType === 'human' && perspectiveId) {
      const humanResult = await client.execute(`SELECT name FROM humans WHERE id = ?`, [perspectiveId]);
      if (humanResult.rows && humanResult.rows.length > 0) {
        perspectiveName = humanResult.rows[0].name as string;
      }
    } else if (perspectiveType === 'agent' && perspectiveId) {
      const agentResult = await client.execute(`SELECT name FROM agents WHERE id = ?`, [perspectiveId]);
      if (agentResult.rows && agentResult.rows.length > 0) {
        perspectiveName = agentResult.rows[0].name as string;
      }
    }

    return NextResponse.json({
      perspective: {
        type: perspectiveType || 'human',
        id: perspectiveId || 'default',
        name: perspectiveName,
      },
      tasks: tasksByStatus,
      stats,
    });
  } catch (error) {
    console.error('Get board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
