"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { GROUP_ORDER } from "@/lib/categories";

interface Category {
  id: string;
  name: string;
  keywords: string[];
  grupo: string | null;
  orden?: number;
}

const DEFAULT_CATEGORY = "Sin categoría";
const GRUPO_OPTIONS = GROUP_ORDER;

export default function CategoryManager({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Alta
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newGrupo, setNewGrupo] = useState<string>(GRUPO_OPTIONS[0]);
  const [creating, setCreating] = useState(false);

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editGrupo, setEditGrupo] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Lista agrupada por grupo, en el orden canónico (grupos desconocidos al final).
  const groupedList = useMemo(() => {
    const buckets = new Map<string, Category[]>();
    for (const c of categories) {
      const g = c.grupo && GRUPO_OPTIONS.includes(c.grupo) ? c.grupo : "Otras";
      const list = buckets.get(g) ?? [];
      list.push(c);
      buckets.set(g, list);
    }
    const order = [...GRUPO_OPTIONS, "Otras"];
    return order
      .map((g) => ({ grupo: g, items: buckets.get(g) ?? [] }))
      .filter((b) => b.items.length);
  }, [categories]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setCategories(data.categories);
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

  const parseKeywords = (raw: string) =>
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          keywords: parseKeywords(newKeywords),
          grupo: newGrupo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNewName("");
      setNewKeywords("");
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditKeywords(c.keywords.join(", "));
    setEditGrupo(c.grupo ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditKeywords("");
    setEditGrupo("");
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          keywords: parseKeywords(editKeywords),
          grupo: editGrupo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      cancelEdit();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Category) => {
    if (
      !confirm(
        `¿Eliminar la categoría "${c.name}"? Los movimientos que la usaban pasarán a "${DEFAULT_CATEGORY}".`
      )
    )
      return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-[var(--hairline)] bg-[var(--page)] px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-[var(--egreso)] bg-[var(--surface)] px-4 py-3 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Alta de categoría */}
      <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 text-sm font-medium text-[var(--ink-2)]">
          Nueva categoría
        </h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Las <em>palabras clave</em> (separadas por comas) sirven para
          categorizar automáticamente los movimientos según la contraparte.
        </p>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Nombre
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inputCls}
              placeholder="Ej. Salud"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Grupo
            <select
              value={newGrupo}
              onChange={(e) => setNewGrupo(e.target.value)}
              className={inputCls}
            >
              {GRUPO_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Palabras clave
            <input
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              className={inputCls}
              placeholder="farmacia, clinica, botica"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50 sm:w-auto"
            >
              {creating ? "Agregando…" : "Agregar"}
            </button>
          </div>
        </form>
      </section>

      {/* Listado */}
      <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
          Categorías ({categories.length})
        </h2>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--grid)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Grupo</th>
                  <th className="py-2 pr-4">Palabras clave</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {groupedList.map((bucket) => (
                  <Fragment key={bucket.grupo}>
                    <tr className="bg-[var(--page)]">
                      <td
                        colSpan={4}
                        className="py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                      >
                        {bucket.grupo}
                      </td>
                    </tr>
                    {bucket.items.map((c) => {
                      const isDefault = c.name === DEFAULT_CATEGORY;
                      const isEditing = editingId === c.id;
                      const busy = busyId === c.id;
                      return (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--grid)] align-top last:border-0"
                    >
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputCls}
                          />
                        ) : (
                          <span className="font-medium">{c.name}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <select
                            value={editGrupo}
                            onChange={(e) => setEditGrupo(e.target.value)}
                            className={inputCls}
                          >
                            <option value="">— sin grupo —</option>
                            {GRUPO_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-[var(--ink-2)]">
                            {c.grupo ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editKeywords}
                            onChange={(e) => setEditKeywords(e.target.value)}
                            className={inputCls}
                            placeholder="separadas por comas"
                          />
                        ) : c.keywords.length ? (
                          <div className="flex flex-wrap gap-1">
                            {c.keywords.map((k) => (
                              <span
                                key={k}
                                className="rounded-md border border-[var(--hairline)] bg-[var(--page)] px-2 py-0.5 text-xs text-[var(--ink-2)]"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEdit(c.id)}
                              disabled={busy}
                              className="rounded-md bg-[var(--ink)] px-3 py-1 text-xs font-medium text-[var(--surface)] disabled:opacity-50"
                            >
                              {busy ? "…" : "Guardar"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={busy}
                              className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => remove(c)}
                              disabled={busy || isDefault}
                              title={
                                isDefault
                                  ? "La categoría por defecto no se puede eliminar"
                                  : undefined
                              }
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
                  </Fragment>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      Aún no hay categorías. Crea la primera arriba.
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
