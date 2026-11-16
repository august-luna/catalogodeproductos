import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const wranglerCli = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [wranglerCli, "deploy", ...process.argv.slice(2)],
  {
  env: { ...process.env, OPEN_NEXT_DEPLOY: "true" },
  stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
