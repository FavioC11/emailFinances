"use client";

import { useState } from "react";

export default function AskAI() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-5">
      <h2 className="mb-4 text-sm font-medium text-[var(--ink-2)]">
        Pregúntale a la IA
      </h2>
      <form onSubmit={ask} className="flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-[var(--hairline)] bg-[var(--page)] px-3 py-2 text-sm"
          placeholder="¿En qué gasté más este mes? ¿Cómo van mis ingresos vs el mes pasado?"
        />
        <div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--surface)] disabled:opacity-50"
          >
            {loading ? "Analizando…" : "Analizar"}
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--egreso)" }}>
          {error}
        </p>
      )}
      {answer && (
        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--page)] p-4 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </section>
  );
}
