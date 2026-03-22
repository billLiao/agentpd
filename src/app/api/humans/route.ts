import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/auth-helper';
import { generateId, hashPassword } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    const client = await getClient();

    if (email) {
      const result = await client.execute(`SELECT * FROM humans WHERE email = '${email}'`);
      if (!result.rows || result.rows.length === 0) {
        return NextResponse.json({ error: 'Human not found' }, { status: 404 });
      }
      const human = result.rows[0] as Record<string, unknown>;
      return NextResponse.json({
        id: human.id,
        name: human.name,
        email: human.email,
        role: human.role,
        createdAt: human.created_at,
      });
    }

    const result = await client.execute(`SELECT * FROM humans`);
    return NextResponse.json((result.rows || []).map((h: Record<string, unknown>) => ({
      id: h.id,
      name: h.name,
      email: h.email,
      role: h.role,
      createdAt: h.created_at,
    })));
  } catch (error) {
    console.error('Get humans error:', error);
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
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const existing = await client.execute(`SELECT id FROM humans WHERE email = ?`, [email]);

    if (existing.rows && existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const userId = generateId('human');
    const passwordHash = await hashPassword('default123');
    const now = new Date().toISOString();

    await client.execute(
      `INSERT INTO humans (id, name, email, password_hash, is_human, role, created_at, last_active, accessible_agents, preferences, view_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        email,
        passwordHash,
        1,
        role || 'developer',
        now,
        now,
        '[]',
        '{}',
        '{}',
      ]
    );

    return NextResponse.json({
      id: userId,
      name,
      email,
      role: role || 'developer',
    }, { status: 201 });
  } catch (error) {
    console.error('Create human error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
