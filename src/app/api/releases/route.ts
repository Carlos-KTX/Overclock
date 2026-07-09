import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isRegion, isTherapeuticLine, isReleaseType } from "@/lib/constants";

export const runtime = "nodejs";

interface ReleaseRow {
  id: number;
  product_name: string;
  company: string | null;
  region: string;
  therapeutic_line: string;
  release_type: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_date: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const regions = params.getAll("region").filter(isRegion);
  const therapeuticLines = params.getAll("therapeuticLine").filter(isTherapeuticLine);
  const releaseTypes = params.getAll("releaseType").filter(isReleaseType);
  const limit = Math.min(Number(params.get("limit")) || 50, 200);
  const offset = Number(params.get("offset")) || 0;

  const db = await getDb();
  const conditions: string[] = ["duplicate_of_release_id IS NULL"];
  const args: (string | number)[] = [];

  if (regions.length) {
    conditions.push(`region IN (${regions.map(() => "?").join(",")})`);
    args.push(...regions);
  }
  if (therapeuticLines.length) {
    conditions.push(`therapeutic_line IN (${therapeuticLines.map(() => "?").join(",")})`);
    args.push(...therapeuticLines);
  }
  if (releaseTypes.length) {
    conditions.push(`release_type IN (${releaseTypes.map(() => "?").join(",")})`);
    args.push(...releaseTypes);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rowsResult = await db.execute({
    sql: `SELECT id, product_name, company, region, therapeutic_line, release_type, summary,
                 source_name, source_url, published_date, created_at
          FROM releases
          ${whereClause}
          ORDER BY COALESCE(published_date, created_at) DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });
  const rows = rowsResult.rows as unknown as ReleaseRow[];

  const totalResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM releases ${whereClause}`,
    args,
  });
  const totalRow = totalResult.rows[0] as unknown as { count: number };

  return NextResponse.json({
    releases: rows,
    total: totalRow.count,
    limit,
    offset,
  });
}
