import { sbAdmin } from "@/lib/supabase";
import { fetchGmail, type IncomingEmail } from "@/lib/gmail";
import { fetchGraph } from "@/lib/graph";
import { parseYape } from "@/lib/parsers/yape";
import { parseBcp } from "@/lib/parsers/bcp";
import {
  parseInterbankPlin,
  parseInterbankPagoTarjeta,
  parseInterbankTransferencia,
} from "@/lib/parsers/interbank";
import { parseInterbankTarjeta } from "@/lib/parsers/interbank-tarjeta";
import { parseIoServicio } from "@/lib/parsers/io";
import { parseBbvaServicio, parseBbvaRetiro } from "@/lib/parsers/bbva";
import { parseScotiabankPlin, parseScotiabankQR } from "@/lib/parsers/scotiabank";
import type { Parser } from "@/lib/parsers/types";
import { categorize, type CategoryRule } from "@/lib/categorize";

const parsers: Record<string, Parser> = {
  yape: parseYape,
  bcp: parseBcp,
  interbank: parseInterbankPlin,
  "interbank-pago-tarjeta": parseInterbankPagoTarjeta,
  "interbank-transferencia": parseInterbankTransferencia,
  "interbank-tarjeta": parseInterbankTarjeta,
  io: parseIoServicio,
  bbva: parseBbvaServicio,
  "bbva-retiro": parseBbvaRetiro,
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
  sources: Record<string, { fetched: number; inserted: number; error?: string }>;
}

// Pagos que no son gasto real: ZiPago (se paga solo para mantener movimiento
// en la tarjeta de crédito y el dinero vuelve) y TUCAMBISTA (a pedido del
// usuario) — no deben registrarse como egreso.
const EXCLUDED_COUNTERPARTY = [/zipago/i, /tucambista/i];

function isExcludedCounterparty(counterparty: string | null): boolean {
  return counterparty != null && EXCLUDED_COUNTERPARTY.some((p) => p.test(counterparty));
}

// Transferencias entre cuentas propias del usuario (mismo Interbank) — no son
// gasto real, solo mueven dinero de una cuenta propia a otra.
const OWN_ACCOUNTS = ["CUENTA_PROPIA_REDACTADA_1", "CUENTA_PROPIA_REDACTADA_2"];

function isOwnAccountTransfer(counterpartyAccount: string | null | undefined): boolean {
  if (!counterpartyAccount) return false;
  const normalized = counterpartyAccount.replace(/\s+/g, "");
  return OWN_ACCOUNTS.some((acc) => normalized.includes(acc));
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
          // Algunos bancos no incluyen número de operación (p.ej. consumos
          // con tarjeta física) — se usa el id del correo como respaldo
          // para el dedup en vez de perder la transacción.
          const operation_no = parsed.operation_no ?? e.id;
          if (
            !parsed.amount ||
            isExcludedCounterparty(parsed.counterparty) ||
            isOwnAccountTransfer(parsed.counterpartyAccount)
          ) {
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

  return { ok: true, inserted, skipped, sources: perSource };
}
