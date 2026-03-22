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
    const ownerId = searchParams.get('owner_id');
    const ownerType = searchParams.get('owner_type');

    if (!ownerId || !ownerType) {
      return NextResponse.json(
        { error: 'Missing required params: owner_id, owner_type' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const result = await client.execute(
      `SELECT * FROM board_configs WHERE owner_id = '${ownerId}' AND owner_type = '${ownerType}'`
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({
        columns: [],
        filters: {},
        sort: {},
      });
    }

    const config = result.rows[0] as Record<string, unknown>;
    return NextResponse.json({
      columns: typeof config.columns === 'string' ? JSON.parse(config.columns as string) : config.columns,
      filters: typeof config.filters === 'string' ? JSON.parse(config.filters as string) : config.filters,
      sort: typeof config.sort === 'string' ? JSON.parse(config.sort as string) : config.sort,
    });
  } catch (error) {
    console.error('Get board config error:', error);
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
    const { owner_id, owner_type, columns, filters, sort } = body;

    if (!owner_id || !owner_type) {
      return NextResponse.json(
        { error: 'Missing required fields: owner_id, owner_type' },
        { status: 400 }
      );
    }

    const client = await getClient();
    const now = new Date().toISOString();

    const existing = await client.execute(
      `SELECT id FROM board_configs WHERE owner_id = '${owner_id}' AND owner_type = '${owner_type}'`
    );

    if (existing.rows && existing.rows.length > 0) {
      await client.execute(
        `UPDATE board_configs SET columns = ?, filters = ?, sort = ?, updated_at = ? WHERE owner_id = ? AND owner_type = ?`,
        [
          JSON.stringify(columns || []),
          JSON.stringify(filters || {}),
          JSON.stringify(sort || {}),
          now,
          owner_id,
          owner_type,
        ]
      );
    } else {
      await client.execute(
        `INSERT INTO board_configs (id, owner_id, owner_type, columns, filters, sort, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId('config'),
          owner_id,
          owner_type,
          JSON.stringify(columns || []),
          JSON.stringify(filters || {}),
          JSON.stringify(sort || {}),
          now,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save board config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
