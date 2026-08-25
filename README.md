# Finanzas por Correo

Tracker personal de finanzas que lee tus correos de notificación bancaria
(**Yape → Gmail**, **tarjeta BCP → Outlook**), los parsea con regex, los
deduplica por número de operación y te deja ver ingresos/egresos, gráficas,
ingresos manuales y análisis con IA (Claude). Corre **primero en local** y se
despliega online sin reescribir nada: tú solo pones credenciales.

**Stack:** Next.js 15 (App Router) + TypeScript · Tailwind CSS · Recharts ·
Supabase (Postgres + Auth + RLS) · Gmail API · Microsoft Graph · Anthropic API.

## Estructura

```
├─ supabase/migrations/       # schema (tablas + RLS) y seeds (fuentes Yape/BCP, categorías)
├─ scripts/
│  ├─ auth-google.ts          # imprime GOOGLE_REFRESH_TOKEN (pnpm auth:google)
│  ├─ auth-ms.ts              # imprime MS_REFRESH_TOKEN    (pnpm auth:ms)
│  └─ poll.ts                 # dispara la ingesta en local (pnpm poll)
├─ src/
│  ├─ app/
│  │  ├─ page.tsx             # dashboard
│  │  └─ api/
│  │     ├─ ingest/route.ts   # motor de ingesta (Gmail + Graph → parsers → Postgres)
│  │     ├─ analyze/route.ts  # preguntas a Claude
│  │     └─ transactions/route.ts  # lectura, ingreso manual y edición de categoría
│  ├─ lib/                    # supabase, gmail, graph, parsers (yape/bcp), fechas, categorías
│  └─ components/             # BalanceCard, Charts, TxTable, ManualEntryForm, AskAI
```

## Requisitos

| Herramienta | Verificar |
|---|---|
| Node.js 20 LTS o 22 | `node -v` |
| pnpm 9+ | `pnpm -v` |
| Docker Desktop | `docker -v` |
| Supabase CLI | `supabase -v` |

```bash
npm install -g pnpm supabase
```

## Credenciales (una sola vez)

Copia la plantilla y rellénala conforme obtengas cada credencial:

```bash
cp .env.example .env.local
```

### Google (Gmail API) → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

1. <https://console.cloud.google.com> → crea un proyecto (ej. `finanzas-correo`).
2. **APIs y servicios → Biblioteca → Gmail API → Habilitar**.
3. **Pantalla de consentimiento OAuth:** tipo **Externo**, agrega tu propio Gmail
   como *usuario de prueba* y deja la app en modo **Testing** (así no entras a CASA).
4. Scope: `https://www.googleapis.com/auth/gmail.readonly`.
5. **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**,
   con redirect `http://localhost:3000/oauth/google/callback`. Copia Client ID y Secret a `.env.local`.
6. Con el ID/Secret ya en `.env.local` (y `pnpm dev` detenido): `pnpm auth:google`
   → autoriza en el navegador → copia el `GOOGLE_REFRESH_TOKEN` impreso.

### Microsoft (Graph / Outlook) → `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REFRESH_TOKEN`

1. <https://portal.azure.com> → **Microsoft Entra ID → Registros de aplicaciones → Nuevo registro**.
2. Tipos de cuenta: **cuentas personales de Microsoft** → `MS_TENANT_ID=consumers`.
3. **Autenticación → Agregar plataforma → Web** → redirect `http://localhost:3000/oauth/ms/callback`.
4. **Permisos de API → Microsoft Graph → Delegados** → `Mail.Read` y `offline_access`.
5. **Certificados y secretos → Nuevo secreto** → copia el **valor** como `MS_CLIENT_SECRET`.
6. Con todo en `.env.local`: `pnpm auth:ms` → autoriza → copia el `MS_REFRESH_TOKEN` impreso.

### Anthropic → `ANTHROPIC_API_KEY`

<https://console.anthropic.com> → API Keys → Create Key (cárgale algo de crédito).
El análisis usa `claude-sonnet-5`; el parseo va con regex, así que solo pagas
las preguntas que hagas (centavos al mes).

### App

`INGEST_SECRET`: cualquier string largo aleatorio (ej. `openssl rand -hex 32`).

## FASE 1 — Correr en local

```bash
pnpm install

# 1. Base de datos local (Docker) + schema + seeds
supabase start          # imprime API URL, anon key y service_role key
supabase db reset       # aplica migrations/ y seeds

# 2. Pega en .env.local las llaves que imprimió `supabase start`
#    (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

# 3. Refresh tokens (una sola vez, ver arriba)
pnpm auth:google
pnpm auth:ms

# 4. Arranca la app
pnpm dev                # http://localhost:3000

# 5. Dispara la ingesta y revisa que entren transacciones
pnpm poll               # o: curl -X POST http://localhost:3000/api/ingest -H "x-ingest-secret: TU_SECRET"
```

Abre el dashboard y confirma que aparecen tus yapeos y consumos. Si algún campo
sale vacío, revisa el JSON `raw` guardado en la tabla `transactions` y ajusta el
regex del parser (`src/lib/parsers/`).

> **Confirma el `body_match` de "yape recibido"**: revisa en tu Gmail el texto
> exacto de un correo cuando *te* yapean y ajústalo en
> `supabase/migrations/0002_seed_sources.sql` (o directo en la tabla `sources`).

## FASE 2 — Desplegar online

### Supabase en la nube

```bash
# Crea el proyecto en https://supabase.com (plan Free) y enlázalo
supabase link --project-ref TU_PROJECT_REF
supabase db push        # sube las migraciones al Postgres en la nube
```

Copia del panel (Settings → API) la URL, anon key y service_role key de producción.

### Frontend en Netlify (o Vercel)

1. Sube el repo a GitHub.
2. Netlify: **Add new site → Import from GitHub** → selecciona el repo.
3. **Site settings → Environment variables:** pega todas las variables del
   `.env.example` con los valores de producción (las de Supabase ahora son las de la nube).
4. Deploy → `https://tu-sitio.netlify.app`.

### Cron horario (pg_cron + pg_net)

En el **SQL Editor** de Supabase:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'ingest-hourly',
  '0 * * * *',                     -- cada hora en punto
  $$
  select net.http_post(
    url     := 'https://tu-sitio.netlify.app/api/ingest',
    headers := jsonb_build_object('x-ingest-secret', 'TU_INGEST_SECRET'),
    body    := '{}'::jsonb
  );
  $$
);
```

> **Fallback sin SQL:** crea un cron gratis en <https://cron-job.org> que haga
> `POST` a `https://tu-sitio.netlify.app/api/ingest` con el header
> `x-ingest-secret`, cada hora.

## Notas de implementación

- **Deduplicación:** `unique (source_key, operation_no)` + upsert con
  `ignoreDuplicates` — correr la ingesta dos veces no duplica nada.
- **Lectura del dashboard:** en el MVP (un usuario, sin login) las filas que
  inserta el cron no tienen `owner_id`, así que el dashboard lee vía
  `/api/transactions` con el service role en el servidor. El RLS ya está listo:
  cuando actives login real (Supabase Auth), cambia la lectura a `sbAnon()` con
  la sesión del usuario.
- **`scripts/auth-ms.ts`** usa el flujo OAuth a mano (fetch) en vez de
  `@azure/msal-node` porque MSAL no expone el refresh token, y aquí hay que
  imprimirlo para pegarlo en `.env.local`.
- **Graph:** el filtro por remitente se hace en el cliente (combinar
  `from` + `receivedDateTime` en `$filter` suele fallar en Graph).
- **Fechas:** los correos traen fechas en español ("17 de agosto de 2025 -
  10:29 PM"); `src/lib/dates.ts` las convierte a ISO con offset fijo de
  America/Lima (UTC-05:00).

## Checklist final

- [ ] Node, pnpm, Docker, Supabase CLI instalados
- [ ] `pnpm install` sin errores
- [ ] `supabase start` + `supabase db reset` sin errores
- [ ] Credenciales Google (3) en `.env.local`
- [ ] Credenciales Microsoft (4) en `.env.local`
- [ ] `ANTHROPIC_API_KEY` en `.env.local`
- [ ] `INGEST_SECRET` definido
- [ ] `pnpm poll` trae transacciones reales
- [ ] Parsers ajustados (todos los campos se llenan)
- [ ] Proyecto Supabase en la nube + `supabase db push`
- [ ] Netlify desplegado con env vars de producción
- [ ] Cron horario activo (pg_cron o cron-job.org)
