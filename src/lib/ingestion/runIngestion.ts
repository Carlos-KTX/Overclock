import { getDb } from "../db";
import { loadActiveSources } from "./sources";
import { fetchRssFeed } from "./fetchFeed";
import { fetchHtmlListing } from "./fetchHtmlListing";

const POLITENESS_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface IngestionSummary {
  sourcesChecked: number;
  itemsFetched: number;
  errors: string[];
}

export async function runIngestionCycle(log: (msg: string) => void = () => {}): Promise<IngestionSummary> {
  const db = await getDb();
  const sources = loadActiveSources().filter((s) => s.type === "rss" || s.type === "html");

  async function upsertSource(source: (typeof sources)[number], lastFetchedAt: string | null, lastError: string | null) {
    await db.execute({
      sql: `INSERT INTO sources (id, name, url, type, region, category, is_active, last_fetched_at, last_error)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET last_fetched_at = excluded.last_fetched_at, last_error = excluded.last_error`,
      args: [source.id, source.name, source.url, source.type, source.region, source.category, lastFetchedAt, lastError],
    });
  }

  const runStart = new Date().toISOString();
  let itemsFetched = 0;
  const errors: string[] = [];

  // Seed/update the sources table first so raw_items' foreign key is always satisfied.
  for (const source of sources) {
    await upsertSource(source, null, null);
  }

  for (const source of sources) {
    const now = new Date().toISOString();
    try {
      log(`Fetching ${source.name} (${source.url})...`);
      const items =
        source.type === "html" && source.htmlScrapeConfig
          ? await fetchHtmlListing(source.htmlScrapeConfig)
          : await fetchRssFeed(source.url);
      let inserted = 0;
      for (const item of items) {
        const result = await db.execute({
          sql: `INSERT INTO raw_items (source_id, source_url, title, excerpt, published_at, fetched_at, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
                ON CONFLICT(source_url) DO NOTHING`,
          args: [source.id, item.link, item.title, item.excerpt, item.publishedAt, now],
        });
        if (result.rowsAffected > 0) inserted++;
      }
      itemsFetched += inserted;
      log(`  -> ${items.length} items seen, ${inserted} new`);
      await upsertSource(source, now, null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  !! Failed: ${message}`);
      errors.push(`${source.id}: ${message}`);
      await upsertSource(source, now, message);
    }
    await sleep(POLITENESS_DELAY_MS);
  }

  await db.execute({
    sql: `INSERT INTO ingestion_runs (started_at, finished_at, sources_checked, items_fetched, items_extracted, errors)
          VALUES (?, ?, ?, ?, 0, ?)`,
    args: [runStart, new Date().toISOString(), sources.length, itemsFetched, errors.join("\n") || null],
  });

  return { sourcesChecked: sources.length, itemsFetched, errors };
}
