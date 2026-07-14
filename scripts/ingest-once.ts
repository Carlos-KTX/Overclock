import { runIngestionCycle } from "../src/lib/ingestion/runIngestion";

runIngestionCycle(console.log)
  .then((summary) => {
    console.log(`\nDone. ${summary.sourcesChecked} sources checked, ${summary.itemsFetched} new raw items.`);
    if (summary.errors.length) console.log(`Errors:\n${summary.errors.join("\n")}`);
    // The RSS/HTML fetches above leave undici keep-alive sockets open, which
    // otherwise keeps this CLI process alive for minutes waiting for them to
    // idle-time-out on their own. Exit explicitly once the work is done.
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
