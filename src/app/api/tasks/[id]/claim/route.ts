import { NextRequest, NextResponse } from 'next/server';
import { claimTask } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function POST(
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
    const { agent_id, agent_session_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Missing required field: agent_id' },
        { status: 400 }
      );
    }

    const result = await claimTask(id, agent_id, agent_session_id);

    if (!result.success) {
      if (result.pendingDependencies) {
        return NextResponse.json(
          {
            error: 'dependencies_not_met',
            message: result.error,
            pending_dependencies: result.pendingDependencies,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Task claimed successfully' });
  } catch (error) {
    console.error('Claim task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
