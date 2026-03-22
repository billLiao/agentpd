import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, retryTask } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';

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
    const { reason } = body;

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const result = await retryTask(id, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedTask = await getTaskById(id);
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Retry task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
