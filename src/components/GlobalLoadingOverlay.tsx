"use client";

import { useEffect, useState } from "react";

// Overlay global de carga — equivalente al interceptor HTTP de Angular.
// En vez de tocar cada fetch del código, se envuelve el `window.fetch` UNA vez
// y se lleva un contador de llamadas en curso. El overlay se muestra mientras
// el contador sea > 0, así que si hay varias llamadas simultáneas y una termina
// antes, el spinner NO se corta hasta que TODAS terminen.

let patched = false;
let count = 0;
const listeners = new Set<(n: number) => void>();
const emit = () => listeners.forEach((l) => l(count));

// Solo cuenta llamadas a nuestra API (no los fetch internos de Next/HMR, RSC,
// etc.). Si algún día se llama a un endpoint externo que también deba mostrar
// el overlay, se agrega su patrón aquí.
function shouldTrack(input: RequestInfo | URL): boolean {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
  return url.includes("/api/");
}

function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const track = shouldTrack(input);
    if (track) {
      count++;
      emit();
    }
    try {
      return await original(input, init);
    } finally {
      // finally garantiza el decremento aunque la llamada falle o se aborte,
      // para que el contador nunca quede "colgado" y el overlay atascado.
      if (track) {
        count = Math.max(0, count - 1);
        emit();
      }
    }
  };
}

// Pequeño retardo antes de mostrar: evita el parpadeo en respuestas casi
// instantáneas. Si la llamada termina antes de este umbral, no se ve nada.
const SHOW_DELAY_MS = 120;

export default function GlobalLoadingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    patchFetch();
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    const listener = (n: number) => {
      if (n > 0) {
        if (!showTimer && !visible) {
          showTimer = setTimeout(() => {
            showTimer = null;
            setVisible(true);
          }, SHOW_DELAY_MS);
        }
      } else {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        setVisible(false);
      }
    };
    listeners.add(listener);
    listener(count); // sincroniza con llamadas ya en curso al montar
    return () => {
      listeners.delete(listener);
      if (showTimer) clearTimeout(showTimer);
    };
    // `visible` está en las deps: el gate `!visible` evita reprogramar un timer
    // redundante mientras el overlay ya se muestra.
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--surface)] px-6 py-5 shadow-xl">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grid)] border-t-[var(--ink)]" />
        <span className="text-sm text-[var(--ink-2)]">Cargando…</span>
      </div>
    </div>
  );
}
