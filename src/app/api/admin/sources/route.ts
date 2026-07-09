import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface SourceRow {
  id: string;
  name: string;
  url: string;
  type: string;
  region: string;
  category: string;
  is_active: number;
  last_fetched_at: string | null;
  last_error: string | null;
  raw_item_count: number;
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT s.id, s.name, s.url, s.type, s.region, s.category, s.is_active, s.last_fetched_at, s.last_error,
            (SELECT COUNT(*) FROM raw_items ri WHERE ri.source_id = s.id) as raw_item_count
     FROM sources s
     ORDER BY s.category, s.name`
  );
  const rows = result.rows as unknown as SourceRow[];

  return NextResponse.json({ sources: rows });
}
