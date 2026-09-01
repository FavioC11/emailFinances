"use client";

import { useState } from "react";

// Botón de acción destructiva: vacía transactions, unrecognized y email_state
// (vía /api/reset) para empezar de cero. Abre un modal que EXPLICA exactamente
// qué se borra y qué se conserva antes de confirmar, porque la acción es
// irreversible. Al terminar, avisa al padre para refrescar la vista.
export default function ResetDataButton({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const d = data.deleted as Record<string, number>;
      setMsg(
        `Listo: ${d.transactions ?? 0} movimientos, ${d.unrecognized ?? 0} sin reconocer y ` +
          `${d.email_state ?? 0} marcas de correo eliminadas. Usa "Actualizar desde correo" para re-traer todo.`
      );
      setOpen(false);
      onDone?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
        className="rounded-lg border border-[var(--egreso)] px-4 py-2 text-sm font-medium text-[var(--egreso)] hover:bg-[var(--egreso)] hover:text-[var(--surface)] disabled:opacity-50"
      >
        Limpiar datos
      </button>
      {msg && (
        <span className="max-w-xs text-right text-xs text-[var(--ink-2)]">
          {msg}
        </span>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--grid)] bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-title" className="text-lg font-semibold text-[var(--egreso)]">
              Limpiar todos los datos
            </h2>
            <p className="mt-2 text-sm text-[var(--ink-2)]">
              Esta acción es <strong>irreversible</strong>. Vas a vaciar por completo:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--ink)]">
              <li>
                <strong>Movimientos</strong> — todas las transacciones registradas.
              </li>
              <li>
                <strong>No reconocidos</strong> — correos que no se pudieron leer.
              </li>
              <li>
                <strong>Marcas de correo</strong> — el punto “hasta aquí ya leí” de
                cada fuente.
              </li>
            </ul>
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              Como se borran las marcas de correo, la próxima vez que uses{" "}
              <strong>“Actualizar desde correo”</strong> se{" "}
              <strong>re-descargará todo tu historial</strong> y se volverá a
              clasificar con la lógica actual.
            </p>
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              Se <strong>conservan</strong> tus fuentes, categorías y exclusiones
              (la configuración no se toca).
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-[var(--grid)] px-4 py-2 text-sm font-medium text-[var(--ink-2)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={run}
                disabled={busy}
                className="rounded-lg bg-[var(--egreso)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50"
              >
                {busy ? "Limpiando…" : "Sí, borrar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
