import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getHumanById } from '@/lib/services/auth.service';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value || null;
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') {
    return null;
  }

  const human = await getHumanById(payload.sub);
  if (!human) {
    return null;
  }

  return {
    id: human.id as string,
    name: human.name as string,
    email: human.email as string,
    role: human.role as string,
  };
}

export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser; token: string } | { error: Response }> {
  const token = await getTokenFromRequest(request);

  if (!token) {
    return {
      error: Response.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    return {
      error: Response.json({ error: 'Invalid or expired token' }, { status: 401 })
    };
  }

  return { user, token };
}
