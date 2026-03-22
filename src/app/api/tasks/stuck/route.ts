import { NextRequest, NextResponse } from 'next/server';
import { getStuckTasks } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const stuckTasks = await getStuckTasks();

    return NextResponse.json({
      stuck_tasks: stuckTasks.map(task => ({
        id: task.id,
        title: task.title,
        claimed_agent: task.claimedAgent,
        stuck_at: task.stuckAt,
        duration: task.stuckAt
          ? formatDuration(Date.now() - new Date(task.stuckAt).getTime())
          : 'unknown',
      })),
    });
  } catch (error) {
    console.error('Get stuck tasks error:', error);
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
