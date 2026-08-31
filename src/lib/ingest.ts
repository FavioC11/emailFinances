import { sbAdmin } from "@/lib/supabase";
import { fetchGmail } from "@/lib/gmail";
import { fetchGraph } from "@/lib/graph";
import { parseYape } from "@/lib/parsers/yape";
import { parseBcp } from "@/lib/parsers/bcp";
import type { Parser } from "@/lib/parsers/types";
import { categorize, type CategoryRule } from "@/lib/categorize";

const parsers: Record<string, Parser> = { yape: parseYape, bcp: parseBcp };

interface Source {
  key: string;
  platform: "gmail" | "outlook";
  from_address: string;
  body_match: string | null;
  direction: "ingreso" | "egreso";
  parser_key: string;
}

export interface IngestResult {
  ok: true;
  inserted: number;
  skipped: number;
  sources: Record<string, { fetched: number; inserted: number; error?: string }>;
}

// Lee correos nuevos de cada fuente activa, parsea, categoriza y hace upsert.
// Compartido por el cron protegido (/api/ingest) y el botón del dashboard (/api/sync).
export async function runIngest(): Promise<IngestResult> {
  const db = sbAdmin();
  const { data: sources, error: srcError } = await db
    .from("sources")
    .select("*")
    .eq("active", true);
  if (srcError) throw new Error(srcError.message);

  // IMPORTANTE: ordenado por `orden` para que la prioridad de match funcione
  // (p.ej. AGUA/LUZ gana a YAPE; Tecnología gana a Mercado).
  const { data: cats } = await db
    .from("categories")
    .select("name,keywords")
    .order("orden", { ascending: true });
  const rules: CategoryRule[] = (cats ?? []).filter((c) => c.name !== "Sin categoría");

  let inserted = 0;
  let skipped = 0;
  const perSource: IngestResult["sources"] = {};

  for (const s of (sources ?? []) as Source[]) {
    perSource[s.key] = { fetched: 0, inserted: 0 };
    try {
      const { data: state } = await db
        .from("email_state")
        .select("*")
        .eq("source_key", s.key)
        .maybeSingle();
      const since = state?.last_seen_at ?? "1970-01-01";

      const emails =
        s.platform === "gmail"
          ? await fetchGmail(s.from_address, since)
          : await fetchGraph(s.from_address, since);
      perSource[s.key].fetched = emails.length;

      let lastEmailId: string | null = null;
      for (const e of emails) {
        if (s.body_match && !e.text.includes(s.body_match)) continue; // confirma dirección
        const parser = parsers[s.parser_key];
        if (!parser) continue;
        const parsed = parser(e.text);
        if (!parsed.amount || !parsed.operation_no) {
          skipped++;
          continue;
        }

        const { data: upserted, error } = await db
          .from("transactions")
          .upsert(
            {
              source_key: s.key,
              direction: parsed.direction ?? s.direction,
              amount: parsed.amount,
              currency: parsed.currency,
              occurred_at: parsed.occurred_at ?? e.receivedAt,
              counterparty: parsed.counterparty,
              category: categorize(parsed.counterparty, rules),
              operation_no: parsed.operation_no,
              email_id: e.id,
              origin: "auto",
              raw: parsed,
            },
            { onConflict: "source_key,operation_no", ignoreDuplicates: true }
          )
          .select("id");
        if (error) {
          perSource[s.key].error = error.message;
        } else if ((upserted ?? []).length > 0) {
          inserted++;
          perSource[s.key].inserted++;
          lastEmailId = e.id;
        }
      }

      await db.from("email_state").upsert({
        source_key: s.key,
        last_seen_at: new Date().toISOString(),
        ...(lastEmailId ? { last_email_id: lastEmailId } : {}),
      });
    } catch (err) {
      perSource[s.key].error = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: true, inserted, skipped, sources: perSource };
}
