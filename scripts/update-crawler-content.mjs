// Refreshes scripts/crawler-content.json from the real render of each page in
// e2e/crawler-content.spec.ts. Run it after changing copy on one of them; CI's
// smoke job fails until the capture matches the page again.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["playwright", "test", "e2e/crawler-content.spec.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, UPDATE_CRAWLER_CONTENT: "1" },
});
process.exitCode = result.status ?? 1;
