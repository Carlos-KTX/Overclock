import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('rss', 'html')),
    region TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('news', 'regulator')),
    is_active INTEGER NOT NULL DEFAULT 1,
    robots_checked_at TEXT,
    last_fetched_at TEXT,
    last_error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS raw_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL REFERENCES sources(id),
    source_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'skipped', 'irrelevant', 'processed', 'error'))
  )`,
  `CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_item_id INTEGER NOT NULL REFERENCES raw_items(id),
    product_name TEXT NOT NULL,
    company TEXT,
    region TEXT NOT NULL,
    therapeutic_line TEXT NOT NULL,
    release_type TEXT NOT NULL CHECK (release_type IN ('approval', 'launch', 'pipeline')),
    summary TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    published_date TEXT,
    duplicate_of_release_id INTEGER REFERENCES releases(id),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ingestion_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    sources_checked INTEGER NOT NULL DEFAULT 0,
    items_fetched INTEGER NOT NULL DEFAULT 0,
    items_extracted INTEGER NOT NULL DEFAULT 0,
    errors TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_releases_region ON releases(region)`,
  `CREATE INDEX IF NOT EXISTS idx_releases_therapeutic_line ON releases(therapeutic_line)`,
  `CREATE INDEX IF NOT EXISTS idx_releases_release_type ON releases(release_type)`,
  `CREATE INDEX IF NOT EXISTS idx_releases_published_date ON releases(published_date)`,
];

declare global {
  // eslint-disable-next-line no-var
  var __overclockDb: Client | undefined;
  // eslint-disable-next-line no-var
  var __overclockDbReady: Promise<void> | undefined;
}

/**
 * Locally (no TURSO_DATABASE_URL set) this opens a plain SQLite file on disk -
 * same dev experience as before. In production, point TURSO_DATABASE_URL/
 * TURSO_AUTH_TOKEN at a Turso database so data survives Vercel's ephemeral
 * filesystem and can be shared across serverless invocations.
 */
function createConnection(): Client {
  const remoteUrl = process.env.TURSO_DATABASE_URL;

  if (remoteUrl) {
    return createClient({
      url: remoteUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, "app.db");
  return createClient({ url: `file:${dbPath}` });
}

async function ensureSchema(client: Client, isRemote: boolean): Promise<void> {
  // WAL keeps one persistent -wal file instead of creating and deleting a
  // -journal file on every single write (SQLite's default rollback-journal
  // mode). On Windows, antivirus real-time scanning on hundreds of those
  // create/delete cycles turned a normally-fast ingestion run into one that
  // took 6+ minutes. Local file only - Turso's remote server rejects this
  // PRAGMA outright (SQL_PARSE_ERROR), it doesn't just ignore it, and
  // running it there broke every single request against the database.
  if (!isRemote) {
    await client.execute("PRAGMA journal_mode = WAL");
  }
  for (const statement of SCHEMA_STATEMENTS) {
    await client.execute(statement);
  }
}

export async function getDb(): Promise<Client> {
  if (!globalThis.__overclockDb) {
    const client = createConnection();
    globalThis.__overclockDb = client;
    globalThis.__overclockDbReady = ensureSchema(client, Boolean(process.env.TURSO_DATABASE_URL)).catch((err) => {
      // If setup fails, don't leave a permanently-rejected promise cached on
      // the module-level global - a warm serverless instance would otherwise
      // keep replaying that same failure forever, even after a fix ships,
      // until the instance happens to recycle. Clear the cache so the next
      // call retries from scratch instead.
      globalThis.__overclockDb = undefined;
      globalThis.__overclockDbReady = undefined;
      throw err;
    });
  }
  await globalThis.__overclockDbReady;
  return globalThis.__overclockDb;
}
