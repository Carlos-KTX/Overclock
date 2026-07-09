import { getDb } from "../db";

function normalize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.5;
const LOOKBACK_DAYS = 14;

interface CandidateRow {
  id: number;
  product_name: string;
  company: string | null;
}

export async function findDuplicateReleaseId(
  productName: string,
  company: string | null,
  publishedDate: string | null
): Promise<number | null> {
  const db = await getDb();
  const parsed = publishedDate ? new Date(publishedDate).getTime() : NaN;
  const anchor = Number.isNaN(parsed) ? Date.now() : parsed;
  const cutoff = new Date(anchor - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const result = await db.execute({
    sql: `SELECT id, product_name, company FROM releases
          WHERE duplicate_of_release_id IS NULL
            AND COALESCE(published_date, created_at) >= ?`,
    args: [cutoff],
  });
  const candidates = result.rows as unknown as CandidateRow[];

  const targetTokens = normalize(`${productName} ${company ?? ""}`);

  for (const candidate of candidates) {
    const candidateTokens = normalize(`${candidate.product_name} ${candidate.company ?? ""}`);
    if (jaccardSimilarity(targetTokens, candidateTokens) >= SIMILARITY_THRESHOLD) {
      return candidate.id;
    }
  }
  return null;
}
