import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, getTaskDependencies, getTaskDependents, getTaskComments, updateTaskArtifact, updateTask } from '@/lib/services/task.service';
import { requireAuth } from '@/lib/auth/auth-helper';
import type { Artifact } from '@/lib/api/types';

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
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include');

    if (include === 'dependencies') {
      const dependencies = await getTaskDependencies(id);
      return NextResponse.json({ task_id: id, dependencies });
    }

    if (include === 'dependents') {
      const dependents = await getTaskDependents(id);
      return NextResponse.json({ task_id: id, dependents });
    }

    if (include === 'comments') {
      const comments = await getTaskComments(id);
      return NextResponse.json({ task_id: id, comments });
    }

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { artifact_type, artifact_url, artifact_name } = body;

    const artifact: Artifact = {
      type: artifact_type || 'file',
      url: artifact_url,
      name: artifact_name,
    };

    const result = await updateTaskArtifact(id, artifact);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const task = await getTaskById(id);
    return NextResponse.json(task);
  } catch (error) {
    console.error('Add artifact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { title, objective, priority, following_agents } = body;

    const result = await updateTask(id, {
      title,
      objective,
      priority,
      followingAgents: following_agents,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const task = await getTaskById(id);
    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
