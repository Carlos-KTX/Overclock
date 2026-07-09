import { getDb } from "../db";
import { looksLikeProductRelease } from "./keywordFilter";
import { extractRelease } from "../llm/extractRelease";
import { findDuplicateReleaseId } from "./dedup";

interface RawItem {
  id: number;
  source_id: string;
  source_url: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

export interface ExtractionSummary {
  skipped: number;
  irrelevant: number;
  extracted: number;
  errors: number;
}

export async function runExtractionCycle(log: (msg: string) => void = () => {}): Promise<ExtractionSummary> {
  const db = await getDb();
  const pendingResult = await db.execute(
    `SELECT id, source_id, source_url, title, excerpt, published_at FROM raw_items WHERE status = 'pending'`
  );
  const pending = pendingResult.rows as unknown as RawItem[];

  log(`${pending.length} pending raw items.`);

  const summary: ExtractionSummary = { skipped: 0, irrelevant: 0, extracted: 0, errors: 0 };

  for (const item of pending) {
    if (!looksLikeProductRelease(item.title, item.excerpt ?? "")) {
      await db.execute({ sql: `UPDATE raw_items SET status = ? WHERE id = ?`, args: ["skipped", item.id] });
      summary.skipped++;
      continue;
    }

    try {
      const result = await extractRelease(item.title, item.excerpt ?? "");
      if (!result.isRelevant) {
        await db.execute({ sql: `UPDATE raw_items SET status = ? WHERE id = ?`, args: ["irrelevant", item.id] });
        summary.irrelevant++;
        continue;
      }

      const sourceRowResult = await db.execute({ sql: `SELECT name FROM sources WHERE id = ?`, args: [item.source_id] });
      const sourceRow = sourceRowResult.rows[0] as unknown as { name: string } | undefined;
      const productName = result.productName ?? "Unknown product";
      const duplicateOfReleaseId = await findDuplicateReleaseId(productName, result.company, item.published_at);

      await db.execute({
        sql: `INSERT INTO releases (raw_item_id, product_name, company, region, therapeutic_line, release_type, summary, source_name, source_url, published_date, duplicate_of_release_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          productName,
          result.company,
          result.region ?? "Global/Other",
          result.therapeuticLine ?? "Other/Unspecified",
          result.releaseType ?? "pipeline",
          result.summary ?? "",
          sourceRow?.name ?? item.source_id,
          item.source_url,
          item.published_at,
          duplicateOfReleaseId,
          new Date().toISOString(),
        ],
      });
      await db.execute({ sql: `UPDATE raw_items SET status = ? WHERE id = ?`, args: ["processed", item.id] });
      summary.extracted++;
      log(
        `  extracted: ${productName} (${result.releaseType})${duplicateOfReleaseId ? ` [dup of #${duplicateOfReleaseId}]` : ""} - ${item.title.slice(0, 70)}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  !! extraction failed for raw_item ${item.id}: ${message}`);
      await db.execute({ sql: `UPDATE raw_items SET status = ? WHERE id = ?`, args: ["error", item.id] });
      summary.errors++;
    }
  }

  return summary;
}
