import { sbAdmin } from "@/lib/supabase";
import { fetchGmail, type IncomingEmail } from "@/lib/gmail";
import { fetchGraph } from "@/lib/graph";
import { parseYape } from "@/lib/parsers/yape";
import { parseBcp } from "@/lib/parsers/bcp";
import { parseInterbankPlin } from "@/lib/parsers/interbank";
import { parseInterbankTarjeta } from "@/lib/parsers/interbank-tarjeta";
import { parseIoServicio } from "@/lib/parsers/io";
import { parseBbvaServicio } from "@/lib/parsers/bbva";
import { parseScotiabankPlin, parseScotiabankQR } from "@/lib/parsers/scotiabank";
import type { Parser, ParsedTransaction } from "@/lib/parsers/types";
import { categorize, type CategoryRule } from "@/lib/categorize";
import { limaDayKey } from "@/lib/format";

// Clave de dedup estable para correos SIN número de operación. Junta el día
// (hora Lima), el monto y la contraparte normalizada — lo bastante específico
// para no colapsar compras distintas, y lo bastante estable para que el
// doble-correo de una misma compra caiga en la misma fila.
function stableDedupKey(parsed: ParsedTransaction, email: IncomingEmail): string {
  const iso = parsed.occurred_at ?? email.receivedAt;
  const day = limaDayKey(iso);
  const cp = (parsed.counterparty ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return `auto:${day}:${parsed.amount}:${parsed.currency}:${cp}`;
}

// tipo por default a partir de la dirección (migración segura, ver 0009):
// egreso→gasto, ingreso→ingreso. El usuario reclasifica a transferencia o
// reembolso desde la UI cuando corresponda.
function defaultTipo(direction: "ingreso" | "egreso"): string {
  return direction === "ingreso" ? "ingreso" : "gasto";
}

const parsers: Record<string, Parser> = {
  yape: parseYape,
  bcp: parseBcp,
  interbank: parseInterbankPlin,
  "interbank-tarjeta": parseInterbankTarjeta,
  io: parseIoServicio,
  bbva: parseBbvaServicio,
  "scotiabank-plin": parseScotiabankPlin,
  "scotiabank-qr": parseScotiabankQR,
};

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
  // Correos que el parser no supo leer (monto nulo, formato/moneda nuevos).
  // No se descartan: van a la tabla `unrecognized` para revisarlos a mano.
  unrecognized: number;
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

  // Exclusiones configurables (antes fijas en el código): si la contraparte
  // contiene alguno de estos patrones, el movimiento no se registra.
  const { data: exRows } = await db
    .from("exclusions")
    .select("pattern")
    .eq("active", true);
  const exclusions = (exRows ?? [])
    .map((r) => String(r.pattern).trim().toLowerCase())
    .filter(Boolean);
  const isExcludedCounterparty = (counterparty: string | null): boolean =>
    counterparty != null &&
    exclusions.some((p) => counterparty.toLowerCase().includes(p));

  let inserted = 0;
  let skipped = 0;
  let unrecognized = 0;
  const perSource: IngestResult["sources"] = {};
  const typedSources = (sources ?? []) as Source[];
  for (const s of typedSources) perSource[s.key] = { fetched: 0, inserted: 0 };

  // Varias fuentes pueden compartir remitente (p.ej. BCP tiene 3 fuentes
  // distintas para el mismo from_address) — se agrupan para descargar la
  // bandeja de ese remitente UNA sola vez y repartir el resultado entre
  // todas sus fuentes, en vez de volver a descargar lo mismo por cada una.
  const groups = new Map<string, Source[]>();
  for (const s of typedSources) {
    const groupKey = `${s.platform}::${s.from_address}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(s);
  }

  for (const groupSources of groups.values()) {
    const { data: states } = await db
      .from("email_state")
      .select("*")
      .in(
        "source_key",
        groupSources.map((s) => s.key)
      );
    const stateBySource = new Map((states ?? []).map((st) => [st.source_key, st]));
    // La fecha más antigua entre las fuentes del grupo: así ninguna se queda
    // sin revisar correos que ya vio otra fuente del mismo remitente.
    const since = groupSources
      .map((s) => stateBySource.get(s.key)?.last_seen_at ?? "1970-01-01")
      .reduce((min, d) => (d < min ? d : min));

    let emails: IncomingEmail[];
    try {
      emails =
        groupSources[0].platform === "gmail"
          ? await fetchGmail(groupSources[0].from_address, since)
          : await fetchGraph(groupSources[0].from_address, since);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const s of groupSources) perSource[s.key].error = message;
      continue;
    }

    for (const s of groupSources) {
      perSource[s.key].fetched = emails.length;
      try {
        let lastEmailId: string | null = null;
        for (const e of emails) {
          if (s.body_match && !e.text.includes(s.body_match)) continue; // confirma dirección
          const parser = parsers[s.parser_key];
          if (!parser) continue;
          const parsed = parser(e.text);
          // Dedup. Si el correo trae número de operación, es la clave natural.
          // Si NO lo trae (p.ej. consumos con tarjeta física), antes se usaba el
          // id del correo — pero si el banco manda DOS correos por una compra,
          // salían dos gastos (bug #3). Ahora se construye una clave ESTABLE a
          // partir de monto + contraparte + día (hora Lima): dos correos de la
          // misma compra colapsan en una sola fila.
          const operation_no = parsed.operation_no ?? stableDedupKey(parsed, e);

          // Exclusión intencional del usuario (p.ej. un gateway que solo mueve
          // la tarjeta): se descarta a propósito y no va a "no reconocidos".
          if (isExcludedCounterparty(parsed.counterparty)) {
            skipped++;
            continue;
          }

          // El parser no supo leer el monto (formato nuevo, moneda distinta a
          // S/, etc.). NUNCA se descarta en silencio: va a la bandeja de "no
          // reconocidos" para revisarlo a mano. Dedup por (source_key, email_id).
          if (!parsed.amount) {
            const { error: unrecErr } = await db.from("unrecognized").upsert(
              {
                source_key: s.key,
                email_id: e.id,
                reason: "monto_nulo",
                counterparty: parsed.counterparty,
                snippet: e.text.slice(0, 600),
                raw: parsed,
              },
              { onConflict: "source_key,email_id", ignoreDuplicates: true }
            );
            if (unrecErr) perSource[s.key].error = unrecErr.message;
            else unrecognized++;
            continue;
          }

          const { data: upserted, error } = await db
            .from("transactions")
            .upsert(
              {
                source_key: s.key,
                direction: parsed.direction ?? s.direction,
                tipo: defaultTipo(parsed.direction ?? s.direction),
                amount: parsed.amount,
                currency: parsed.currency,
                amount_pen: parsed.amount_pen ?? null,
                occurred_at: parsed.occurred_at ?? e.receivedAt,
                counterparty: parsed.counterparty,
                category: categorize(parsed.counterparty, rules),
                operation_no,
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
  }

  return { ok: true, inserted, skipped, unrecognized, sources: perSource };
}
