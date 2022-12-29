// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spawnSync } = require("child_process");

const { status, stdout, stderr } = spawnSync(
  "sccache",
  ["--show-stats", "--stats-format", "json"],
  { encoding: "utf-8" }
);

if (status !== 0) {
  console.error(stderr);
  process.exit(status);
}

const { stats } = JSON.parse(stdout);

if (
  !Object.hasOwnProperty.call(stats, "cache_hits") ||
  !Object.hasOwnProperty.call(stats, "cache_misses")
) {
  console.error("Stats output does not have correct format");
  process.exit(1);
}

const { cache_hits, cache_misses } = stats;

// Either cache_hits > 0 or cache_misses > 0 means that cache was accessed
if (
  (cache_hits.counts.Rust && cache_hits.counts.Rust > 0) ||
  (cache_misses.counts.Rust && cache_misses.counts.Rust > 0)
) {
  process.exit(0);
} else {
  console.error("Cache was not accessed");
  process.exit(1);
}
