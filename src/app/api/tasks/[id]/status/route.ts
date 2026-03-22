import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';
import type { TaskStatus } from '@/lib/api/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, agent_id } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const result = await updateTaskStatus(id, status as TaskStatus, agent_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedTask = await getTaskById(id);
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
