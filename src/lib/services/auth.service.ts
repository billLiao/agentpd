import { getClient } from '@/lib/db';
import { createToken, verifyPassword, hashPassword, generateId, verifyToken, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '@/lib/auth/jwt';

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<{
  user: { id: string; name: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | { error: string }> {
  const client = await getClient();

  const checkExisting = await client.execute(
    `SELECT id FROM humans WHERE email = ?`,
    [data.email]
  );

  if (checkExisting.rows && checkExisting.rows.length > 0) {
    return { error: 'Email already registered' };
  }

  const userId = generateId('human');
  const passwordHash = await hashPassword(data.password);
  const now = new Date().toISOString();

  await client.execute(
    `INSERT INTO humans (id, name, email, password_hash, is_human, role, created_at, last_active, accessible_agents, preferences, view_config)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, data.name, data.email, passwordHash, 1, data.role || 'developer', now, now, '[]', '{}', '{}']
  );

  const accessToken = await createToken(userId, 'access');
  const refreshToken = await createToken(userId, 'refresh');

  const accessTokenHash = await hashPassword(accessToken);
  const refreshTokenHash = await hashPassword(refreshToken);
  const accessExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY).toISOString();
  const refreshExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();

  await client.execute(
    `INSERT INTO auth_tokens (id, user_id, token_type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId('token'), userId, 'access', accessTokenHash, accessExpiry, now]
  );
  await client.execute(
    `INSERT INTO auth_tokens (id, user_id, token_type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId('token'), userId, 'refresh', refreshTokenHash, refreshExpiry, now]
  );

  return {
    user: {
      id: userId,
      name: data.name,
      email: data.email,
      role: data.role || 'developer',
    },
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY / 1000,
  };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{
  user: { id: string; name: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | { error: string }> {
  const client = await getClient();

  const result = await client.execute(
    `SELECT id, name, email, role, password_hash FROM humans WHERE email = ?`,
    [data.email]
  );

  if (!result.rows || result.rows.length === 0) {
    return { error: 'Invalid credentials' };
  }

  const row = result.rows[0] as Record<string, unknown>;
  const isValid = await verifyPassword(data.password, row.password_hash as string);
  if (!isValid) {
    return { error: 'Invalid credentials' };
  }

  const now = new Date().toISOString();
  await client.execute(`UPDATE humans SET last_active = ? WHERE id = ?`, [now, row.id as string]);

  const accessToken = await createToken(row.id as string, 'access');
  const refreshToken = await createToken(row.id as string, 'refresh');

  const accessTokenHash = await hashPassword(accessToken);
  const refreshTokenHash = await hashPassword(refreshToken);
  const accessExpiry = new Date(Date.now() + ACCESS_TOKEN_EXPIRY).toISOString();
  const refreshExpiry = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();

  await client.execute(
    `INSERT INTO auth_tokens (id, user_id, token_type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId('token'), row.id as string, 'access', accessTokenHash, accessExpiry, now]
  );
  await client.execute(
    `INSERT INTO auth_tokens (id, user_id, token_type, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId('token'), row.id as string, 'refresh', refreshTokenHash, refreshExpiry, now]
  );

  return {
    user: {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      role: row.role as string,
    },
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY / 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | { error: string }> {
  const payload = await verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return { error: 'Invalid refresh token' };
  }

  const client = await getClient();
  const now = new Date().toISOString();

  const userResult = await client.execute(`SELECT id FROM humans WHERE id = ?`, [payload.sub]);
  if (!userResult.rows || userResult.rows.length === 0) {
    return { error: 'User not found' };
  }

  const userId = userResult.rows[0].id as string;

  const accessToken = await createToken(userId, 'access');
  const newRefreshToken = await createToken(userId, 'refresh');

  await client.execute(
    `INSERT INTO auth_tokens (id, user_id, token_type, token_hash, expires_at, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('token'),
      userId,
      'refresh',
      await hashPassword(newRefreshToken),
      new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString(),
      now,
      now,
    ]
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY / 1000,
  };
}

export async function logoutUser(refreshToken: string): Promise<{ success: boolean }> {
  const payload = await verifyToken(refreshToken);
  if (!payload) {
    return { success: false };
  }

  const client = await getClient();
  await client.execute(`DELETE FROM auth_tokens WHERE user_id = ?`, [payload.sub]);

  return { success: true };
}

export async function getCurrentUser(token: string): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
} | null> {
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') {
    return null;
  }

  const client = await getClient();
  const result = await client.execute(
    `SELECT id, name, email, role FROM humans WHERE id = ?`,
    [payload.sub]
  );

  if (!result.rows || result.rows.length === 0) return null;

  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as string,
  };
}

export async function getHumanById(id: string) {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM humans WHERE id = ?`, [id]);
  if (!result.rows || result.rows.length === 0) return null;
  return result.rows[0];
}

export async function getHumanByEmail(email: string) {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM humans WHERE email = ?`, [email]);
  if (!result.rows || result.rows.length === 0) return null;
  return result.rows[0];
}

export async function createDefaultHuman(): Promise<string | null> {
  const client = await getClient();
  const email = 'default@example.com';

  const existing = await client.execute(`SELECT id FROM humans WHERE email = ?`, [email]);
  if (existing.rows && existing.rows.length > 0) {
    return existing.rows[0].id as string;
  }

  const userId = generateId('human');
  const passwordHash = await hashPassword('default123');
  const now = new Date().toISOString();

  await client.execute(
    `INSERT INTO humans (id, name, email, password_hash, is_human, role, created_at, last_active, accessible_agents, preferences, view_config)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, '默认用户', email, passwordHash, 1, 'developer', now, now, '[]', '{}', '{}']
  );

  return userId;
}
