import { NextRequest, NextResponse } from 'next/server';
import { getTaskComments, addTaskComment } from '@/lib/services/task.service';
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
    const comments = await getTaskComments(id);

    return NextResponse.json({
      task_id: id,
      comments,
    });
  } catch (error) {
    console.error('Get comments error:', error);
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
    const { author_type, author_id, author_name, content, mentions } = body;

    if (!content || !author_id || !author_name) {
      return NextResponse.json(
        { error: 'Missing required fields: content, author_id, author_name' },
        { status: 400 }
      );
    }

    const comment = await addTaskComment(id, {
      authorType: author_type || 'human',
      authorId: author_id,
      authorName: author_name,
      content,
      mentions,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
