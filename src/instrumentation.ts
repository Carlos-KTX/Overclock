export async function register() {
  // node-cron needs a long-running process, which only exists in local dev
  // (`next dev`/`next start`). On Vercel, scheduled ingestion runs instead via
  // the Vercel Cron Job configured in vercel.json hitting /api/cron/ingest.
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startScheduler } = await import("./lib/ingestion/scheduler");
    startScheduler();
  }
}
