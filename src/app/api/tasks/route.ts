import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { createTask, getStuckTasks, getTasksByStatus } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const stuck = searchParams.get('stuck');

    if (stuck === 'true') {
      const stuckTasks = await getStuckTasks();
      return NextResponse.json({ stuck_tasks: stuckTasks });
    }

    if (status) {
      const tasksResult = await getTasksByStatus(status as 'todo' | 'in_progress' | 'waiting_for_human' | 'review' | 'done' | 'failed' | 'blocked');
      return NextResponse.json(tasksResult);
    }

    const client = await getClient();
    const result = await client.execute(`SELECT * FROM tasks`);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const {
      title,
      objective,
      priority,
      creator_type,
      creator_id,
      following_agents,
      dependencies,
      max_retries,
    } = body;

    if (!title || !creator_id) {
      return NextResponse.json(
        { error: 'Missing required fields: title, creator_id' },
        { status: 400 }
      );
    }

    const task = await createTask({
      title,
      objective,
      priority,
      creatorType: creator_type || 'human',
      creatorId: creator_id,
      followingAgents: following_agents,
      dependencies,
      maxRetries: max_retries,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
