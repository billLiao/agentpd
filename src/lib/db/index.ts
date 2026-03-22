import { createClient, type Client } from '@libsql/client';
import path from 'path';

let client: Client | null = null;

function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) return dbUrl;
  const projectRoot = process.cwd();
  const dbPath = path.join(projectRoot, 'data', 'agentpd.db');
  return `file:${dbPath}`;
}

const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

export async function getDb() {
  if (client) return client;

  client = createClient({
    url: getDatabaseUrl(),
    authToken: AUTH_TOKEN,
  });

  await initializeDatabase();

  return client;
}

export async function getClient(): Promise<Client> {
  if (client) return client;
  await getDb();
  return client!;
}

async function initializeDatabase() {
  if (!client) return;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS humans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_human INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'developer',
      created_at TEXT NOT NULL,
      last_active TEXT,
      accessible_agents TEXT NOT NULL DEFAULT '[]',
      current_perspective TEXT,
      preferences TEXT NOT NULL DEFAULT '{}',
      view_config TEXT NOT NULL DEFAULT '{}'
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      capabilities TEXT NOT NULL DEFAULT '[]',
      skills TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'offline',
      last_heartbeat TEXT,
      created_at TEXT NOT NULL,
      owner_id TEXT,
      view_config TEXT NOT NULL DEFAULT '{}',
      metadata TEXT NOT NULL DEFAULT '{}'
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      title TEXT NOT NULL,
      objective TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'p2',
      creator_type TEXT NOT NULL DEFAULT 'human',
      creator_id TEXT NOT NULL,
      following_agents TEXT NOT NULL DEFAULT '[]',
      claimed_agent TEXT,
      assignee_agent_type TEXT,
      agent_session_id TEXT,
      context_refs TEXT NOT NULL DEFAULT '[]',
      artifacts TEXT NOT NULL DEFAULT '[]',
      trace TEXT NOT NULL DEFAULT '{}',
      dependencies TEXT NOT NULL DEFAULT '[]',
      dependents TEXT NOT NULL DEFAULT '[]',
      context_from_deps TEXT NOT NULL DEFAULT '',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 0,
      stuck INTEGER NOT NULL DEFAULT 0,
      stuck_at TEXT,
      created_at TEXT NOT NULL,
      claimed_at TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author_type TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      mentions TEXT NOT NULL DEFAULT '[]',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_type TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS board_configs (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_type TEXT NOT NULL,
      columns TEXT NOT NULL DEFAULT '[]',
      filters TEXT NOT NULL DEFAULT '{}',
      sort TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS hitl_requests (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'medium',
      payload TEXT NOT NULL DEFAULT '{}',
      human_response TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);
}

export { client };
