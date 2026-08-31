"use client";

import { useCallback, useEffect, useState } from "react";

interface Source {
  id: string;
  key: string;
  name: string;
  platform: "gmail" | "outlook";
  from_address: string;
  body_match: string | null;
  direction: "ingreso" | "egreso";
  parser_key: string;
  active: boolean;
}

const PARSER_KEYS = [
  "yape",
  "bcp",
  "interbank",
  "interbank-tarjeta",
  "io",
  "bbva",
  "scotiabank-plin",
  "scotiabank-qr",
];

const emptyNew = {
  key: "",
  name: "",
  platform: "gmail" as "gmail" | "outlook",
  from_address: "",
  body_match: "",
  direction: "egreso" as "ingreso" | "egreso",
  parser_key: PARSER_KEYS[0],
};

const inputCls =
  "w-full rounded-lg border border-[var(--hairline)] bg-[var(--page)] px-3 py-2 text-sm";

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ ...emptyNew });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Source>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSources(data.sources);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDraft({ ...emptyNew });
      setShowNew(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: string, changes: Partial<Source>) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEditingId(null);
      setEdit({});
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: Source) => {
    if (!confirm(`¿Eliminar la fuente "${s.name}"? (Las transacciones ya registradas se conservan.)`))
      return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/sources?id=${encodeURIComponent(s.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (s: Source) => {
    setEditingId(s.id);
    setEdit({
      name: s.name,
      platform: s.platform,
      from_address: s.from_address,
      body_match: s.body_match ?? "",
      direction: s.direction,
      parser_key: s.parser_key,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-[var(--egreso)] bg-[var(--surface)] px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--ink-2)]">Fuentes de correo</h2>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-xs font-medium"
          >
            {showNew ? "Cancelar" : "+ Nueva fuente"}
          </button>
        </div>
        <p className="mb-4 text-xs text-[var(--muted)]">
          El <strong>buzón</strong> (Gmail u Outlook/Hotmail) indica dónde buscar cada
          notificación. Ajústalo según <em>tus</em> propios correos: no afecta la
          configuración de otros usuarios.
        </p>

        {showNew && (
          <form
            onSubmit={create}
            className="mb-4 grid gap-3 rounded-lg border border-[var(--grid)] bg-[var(--page)] p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Clave única (key)
              <input
                required
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                className={inputCls}
                placeholder="ej. bcp-tarjeta"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Nombre
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inputCls}
                placeholder="ej. BCP tarjeta"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Buzón
              <select
                value={draft.platform}
                onChange={(e) =>
                  setDraft({ ...draft, platform: e.target.value as "gmail" | "outlook" })
                }
                className={inputCls}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook / Hotmail</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Remitente (from)
              <input
                required
                value={draft.from_address}
                onChange={(e) => setDraft({ ...draft, from_address: e.target.value })}
                className={inputCls}
                placeholder="notificaciones@banco.com.pe"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Texto que confirma (body match)
              <input
                value={draft.body_match}
                onChange={(e) => setDraft({ ...draft, body_match: e.target.value })}
                className={inputCls}
                placeholder="ej. Tarjeta de Crédito"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Dirección
              <select
                value={draft.direction}
                onChange={(e) =>
                  setDraft({ ...draft, direction: e.target.value as "ingreso" | "egreso" })
                }
                className={inputCls}
              >
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Parser
              <select
                value={draft.parser_key}
                onChange={(e) => setDraft({ ...draft, parser_key: e.target.value })}
                className={inputCls}
              >
                {PARSER_KEYS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50"
              >
                {creating ? "Guardando…" : "Crear fuente"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--grid)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="py-2 pr-4">Fuente</th>
                  <th className="py-2 pr-4">Buzón</th>
                  <th className="py-2 pr-4">Remitente</th>
                  <th className="py-2 pr-4">Activa</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const isEditing = editingId === s.id;
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id} className="border-b border-[var(--grid)] align-top last:border-0">
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            value={edit.name ?? ""}
                            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                            className={inputCls}
                          />
                        ) : (
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-[var(--muted)]">{s.key}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <select
                            value={edit.platform}
                            onChange={(e) =>
                              setEdit({ ...edit, platform: e.target.value as "gmail" | "outlook" })
                            }
                            className={inputCls}
                          >
                            <option value="gmail">Gmail</option>
                            <option value="outlook">Outlook / Hotmail</option>
                          </select>
                        ) : (
                          <span className="rounded-md border border-[var(--hairline)] bg-[var(--page)] px-2 py-0.5 text-xs">
                            {s.platform === "gmail" ? "Gmail" : "Outlook / Hotmail"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            value={edit.from_address ?? ""}
                            onChange={(e) => setEdit({ ...edit, from_address: e.target.value })}
                            className={inputCls}
                          />
                        ) : (
                          <span className="text-xs text-[var(--ink-2)]">{s.from_address}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => patch(s.id, { active: !s.active })}
                          disabled={busy || isEditing}
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            s.active
                              ? "bg-[var(--ingreso)]/15 text-[var(--ingreso)]"
                              : "border border-[var(--hairline)] text-[var(--muted)]"
                          } disabled:opacity-40`}
                          title="Activar / desactivar"
                        >
                          {s.active ? "Activa" : "Inactiva"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => patch(s.id, edit)}
                              disabled={busy}
                              className="rounded-md bg-[var(--ink)] px-3 py-1 text-xs font-medium text-[var(--surface)] disabled:opacity-50"
                            >
                              {busy ? "…" : "Guardar"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEdit({});
                              }}
                              disabled={busy}
                              className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(s)}
                              className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => remove(s)}
                              disabled={busy}
                              className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--egreso)] disabled:opacity-40"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                      No hay fuentes. Crea la primera con “+ Nueva fuente”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
