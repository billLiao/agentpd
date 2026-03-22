import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/auth-helper';
import { generateId } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const client = await getClient();

    if (status) {
      const result = await client.execute(`SELECT * FROM agents WHERE status = ?`, [status]);
      return NextResponse.json(result.rows || []);
    }

    const result = await client.execute(`SELECT * FROM agents`);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Get agents error:', error);
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
    const { name, description, capabilities, skills, metadata } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const client = await getClient();
    const agentId = generateId('agent');
    const now = new Date().toISOString();

    await client.execute(
      `INSERT INTO agents (id, name, description, capabilities, skills, status, created_at, owner_id, view_config, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        name,
        description || '',
        JSON.stringify(capabilities || []),
        JSON.stringify(skills || []),
        'offline',
        now,
        null,
        '{}',
        JSON.stringify(metadata || {}),
      ]
    );

    return NextResponse.json({
      id: agentId,
      name,
      description: description || '',
      capabilities: capabilities || [],
      skills: skills || [],
      status: 'offline',
      createdAt: now,
      metadata: metadata || {},
    }, { status: 201 });
  } catch (error) {
    console.error('Register agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
