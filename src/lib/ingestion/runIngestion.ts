import { getDb } from "../db";
import { loadActiveSources, type SourceConfig } from "./sources";
import { fetchRssFeed, type FeedItem } from "./fetchFeed";
import { fetchHtmlListing } from "./fetchHtmlListing";

// Each source is a distinct host hit exactly once per run (no repeated
// requests to the same domain within a cycle), so there's no politeness
// reason to serialize the network fetches - only a concurrency cap, to
// bound how many outbound connections run at once and keep total
// wall-clock low enough to fit inside a serverless function's timeout.
// DB writes are deliberately NOT done inside this concurrent phase: issuing
// many writes to the database from several concurrent "lanes" at once
// caused severe lock-contention slowdowns against a local SQLite file
// (a 22-source run went from ~30s serial to 6+ minutes concurrent). All
// writes happen afterward, sequentially, in the persist phase below.
const CONCURRENCY = 6;

export interface IngestionSummary {
  sourcesChecked: number;
  itemsFetched: number;
  errors: string[];
}

interface FetchResult {
  source: SourceConfig;
  items: FeedItem[];
  error: string | null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function runIngestionCycle(log: (msg: string) => void = () => {}): Promise<IngestionSummary> {
  const db = await getDb();
  const sources = loadActiveSources().filter((s) => s.type === "rss" || s.type === "html");
  const runStart = new Date().toISOString();

  // Phase 1: fetch every source concurrently. Pure network I/O, no DB access.
  const fetchResults = await mapWithConcurrency<SourceConfig, FetchResult>(sources, CONCURRENCY, async (source) => {
    try {
      log(`Fetching ${source.name} (${source.url})...`);
      const items =
        source.type === "html" && source.htmlScrapeConfig
          ? await fetchHtmlListing(source.htmlScrapeConfig)
          : await fetchRssFeed(source.url);
      log(`  -> ${items.length} items seen (${source.name})`);
      return { source, items, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  !! Failed: ${message} (${source.name})`);
      return { source, items: [], error: message };
    }
  });

  // Phase 2: persist everything as one write transaction per source
  // (db.batch()) instead of one execute() per row. Besides being the
  // correct way to bulk-insert with libsql, this also sidesteps a Windows-
  // specific trap: SQLite's default rollback-journal mode creates and
  // deletes a -journal sidecar file per individual write, and antivirus
  // real-time scanning on hundreds of those create/delete cycles is what
  // turned a normally-fast run into one that took 6+ minutes.
  const now = new Date().toISOString();
  let itemsFetched = 0;
  const errors: string[] = [];

  for (const { source, items, error } of fetchResults) {
    if (error) {
      errors.push(`${source.id}: ${error}`);
      await db.execute({
        sql: `INSERT INTO sources (id, name, url, type, region, category, is_active, last_fetched_at, last_error)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
              ON CONFLICT(id) DO UPDATE SET last_fetched_at = excluded.last_fetched_at, last_error = excluded.last_error`,
        args: [source.id, source.name, source.url, source.type, source.region, source.category, now, error],
      });
      continue;
    }

    const statements = [
      {
        sql: `INSERT INTO sources (id, name, url, type, region, category, is_active, last_fetched_at, last_error)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL)
              ON CONFLICT(id) DO UPDATE SET last_fetched_at = excluded.last_fetched_at, last_error = excluded.last_error`,
        args: [source.id, source.name, source.url, source.type, source.region, source.category, now],
      },
      ...items.map((item) => ({
        sql: `INSERT INTO raw_items (source_id, source_url, title, excerpt, published_at, fetched_at, status)
              VALUES (?, ?, ?, ?, ?, ?, 'pending')
              ON CONFLICT(source_url) DO NOTHING`,
        args: [source.id, item.link, item.title, item.excerpt, item.publishedAt, now],
      })),
    ];
    const results = await db.batch(statements, "write");
    const inserted = results.slice(1).filter((r) => r.rowsAffected > 0).length;
    itemsFetched += inserted;
    log(`  -> ${inserted} new (${source.name})`);
  }

  await db.execute({
    sql: `INSERT INTO ingestion_runs (started_at, finished_at, sources_checked, items_fetched, items_extracted, errors)
          VALUES (?, ?, ?, ?, 0, ?)`,
    args: [runStart, new Date().toISOString(), sources.length, itemsFetched, errors.join("\n") || null],
  });

  return { sourcesChecked: sources.length, itemsFetched, errors };
}
