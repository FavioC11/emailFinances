import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Los clientes se crean de forma perezosa para que `next build`
// no exija credenciales: solo se necesitan en tiempo de ejecución.

let anon: SupabaseClient | null = null;
let admin: SupabaseClient | null = null;

export function sbAnon(): SupabaseClient {
  if (!anon) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
      );
    }
    anon = createClient(url, key);
  }
  return anon;
}

// Solo en el servidor (ingesta y API): salta RLS para leer/escribir
export function sbAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local"
      );
    }
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}
