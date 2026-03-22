import { NextRequest, NextResponse } from 'next/server';
import { getTaskDependents } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    const dependents = await getTaskDependents(id);

    return NextResponse.json({
      task_id: id,
      dependents,
    });
  } catch (error) {
    console.error('Get dependents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
