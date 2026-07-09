import cron from "node-cron";
import { runIngestionCycle } from "./runIngestion";
import { runExtractionCycle } from "./runExtraction";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  const expression = process.env.INGEST_CRON ?? "0 */2 * * *";
  if (!cron.validate(expression)) {
    console.error(`[scheduler] Invalid INGEST_CRON expression "${expression}", scheduler not started.`);
    return;
  }

  console.log(`[scheduler] Ingestion scheduled with cron "${expression}"`);
  cron.schedule(expression, async () => {
    console.log("[scheduler] Running scheduled ingestion cycle...");
    try {
      const ingestion = await runIngestionCycle((msg) => console.log(`[scheduler] ${msg}`));
      const extraction = await runExtractionCycle((msg) => console.log(`[scheduler] ${msg}`));
      console.log("[scheduler] Cycle complete", { ingestion, extraction });
    } catch (err) {
      console.error("[scheduler] Cycle failed", err);
    }
  });
}
