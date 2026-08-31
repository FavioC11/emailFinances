import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";

// Endpoint protegido por secreto — pensado para el cron / `pnpm poll`.
// El botón del dashboard usa /api/sync (mismo origen, sin secreto).
export async function POST(req: NextRequest) {
  if (req.headers.get("x-ingest-secret") !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runIngest());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
