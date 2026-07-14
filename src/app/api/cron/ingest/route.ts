import { NextRequest, NextResponse } from "next/server";
import { runIngestionCycle } from "@/lib/ingestion/runIngestion";
import { runExtractionCycle } from "@/lib/ingestion/runExtraction";

export const runtime = "nodejs";
// Declared for Vercel Pro/Enterprise; Hobby silently caps actual execution
// at 60s regardless, which is why the extraction deadline below stays
// conservative rather than trusting this value at runtime.
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
  // Conservative regardless of plan tier - see maxDuration comment above.
  const deadline = Date.now() + 45_000;

  try {
    const ingestion = await runIngestionCycle(log);
    const extraction = await runExtractionCycle(log, deadline);
    return NextResponse.json({ ok: true, ingestion, extraction, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, logs }, { status: 500 });
  }
}
