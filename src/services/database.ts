import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function initDatabase(): Promise<void> {
  try {
    const dataDir = await appDataDir();
    db = await Database.load("sqlite:arkium.db");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Chat',
        model TEXT NOT NULL DEFAULT '',
        system_prompt TEXT DEFAULT '',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT DEFAULT '{}'
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        thinking TEXT DEFAULT NULL,
        model TEXT DEFAULT NULL,
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        metadata TEXT DEFAULT '{}'
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        tags TEXT DEFAULT '[]',
        is_favorite INTEGER NOT NULL DEFAULT 0,
        use_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        conversation_id TEXT DEFAULT NULL,
        project_id TEXT DEFAULT NULL,
        importance INTEGER DEFAULT 5,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)`);

    console.log("Database initialized");
  } catch (error) {
    console.warn("Database init error (using in-memory fallback):", error);
    // App continues working with Zustand persist as fallback
  }
}

export function getDb(): Database | null {
  return db;
}

export async function dbExecute(sql: string, params?: unknown[]): Promise<void> {
  if (!db) return;
  try {
    await db.execute(sql, params);
  } catch (e) {
    console.error("DB execute error:", e);
  }
}

export async function dbSelect<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!db) return [];
  try {
    return await db.select<T>(sql, params);
  } catch (e) {
    console.error("DB select error:", e);
    return [];
  }
}
