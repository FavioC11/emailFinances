// Dispara la ingesta en local: pnpm poll  (con `pnpm dev` corriendo)
import { loadEnvLocal, requireEnv } from "./env";

loadEnvLocal();
requireEnv("INGEST_SECRET");

const base = process.env.APP_URL ?? "http://localhost:3000";

async function main() {
  const res = await fetch(`${base}/api/ingest`, {
    method: "POST",
    headers: { "x-ingest-secret": process.env.INGEST_SECRET! },
  });
  const data = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(data, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
