// Carga .env.local en process.env para los scripts que corren fuera de Next.js.
import fs from "node:fs";
import path from "node:path";

export function loadEnvLocal(): void {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function requireEnv(...keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Faltan variables en .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }
}
