import { NextRequest, NextResponse } from "next/server";
import { runIngestionCycle } from "@/lib/ingestion/runIngestion";
import { runExtractionCycle } from "@/lib/ingestion/runExtraction";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Invoked by Vercel Cron (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` on cron-triggered requests when a
 * CRON_SECRET env var is set on the project - this rejects any other caller.
 * Locally, node-cron (src/lib/ingestion/scheduler.ts) does this job instead;
 * this route only matters once deployed.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    const ingestion = await runIngestionCycle(log);
    const extraction = await runExtractionCycle(log);
    return NextResponse.json({ ok: true, ingestion, extraction, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
