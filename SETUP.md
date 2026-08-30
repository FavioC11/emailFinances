# Guía de instalación local (paso a paso, versión real)

Esta guía reemplaza/complementa al README con lo que **realmente** funciona al montar el
proyecto desde cero en Windows. Varias cosas resultaron distintas a lo asumido
originalmente; están marcadas con ⚠️ **OJO**.

El objetivo final: leer tus notificaciones de **Yape (Gmail)** y **BCP (Outlook/Hotmail)**,
parsearlas, guardarlas en Supabase y verlas en un dashboard en `http://localhost:3000`.

---

## 0. Requisitos previos

Instala y ten listo:

- **Node.js** 20+ y **pnpm** (`npm i -g pnpm`)
- **Docker Desktop** (Supabase local corre sobre Docker)
- **Supabase CLI** (`npm i -g supabase` o vía Scoop/Chocolatey)
- Una cuenta **Google/Gmail** (donde llega Yape) y una **Microsoft/Outlook/Hotmail** (donde llega BCP)
- Una cuenta en **console.anthropic.com** (para el chat de IA; opcional para arrancar)

---

## 1. Clonar e instalar dependencias

```bash
git clone https://github.com/FavioC11/emailFinances.git
cd emailFinances
pnpm install
```

⚠️ **OJO (pnpm 11):** pnpm bloquea por seguridad los *build scripts* de `esbuild`,
`sharp` y `unrs-resolver`, y `pnpm install` puede terminar con
`ERR_PNPM_IGNORED_BUILDS`. El repo ya trae el archivo **`pnpm-workspace.yaml`** que los
autoriza:

```yaml
allowBuilds:
  esbuild: true
  sharp: true
  unrs-resolver: true
```

Con eso, `pnpm install` corre los builds sin error. (En pnpm 11 esta config va en
`pnpm-workspace.yaml`, **no** en el campo `pnpm` de `package.json` — ese ya no se lee.)

---

## 2. Levantar Supabase local

⚠️ **OJO:** **Docker Desktop tiene que estar corriendo ANTES** de `supabase start`.
Si no, verás:
`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`.
Abre Docker Desktop, espera a que diga "running", y recién entonces:

```bash
supabase start
```

Esto crea la base, aplica las migraciones (`supabase/migrations/`) e imprime un bloque de
credenciales. **Déjalo corriendo.**

### ⚠️ OJO — el error más común: copiar las keys equivocadas

`supabase start` (o `supabase status`) imprime **dos** grupos de credenciales:

| Sección | ¿Sirve? |
|---|---|
| `API URL`, `anon key`, `service_role key` (JWT que empiezan con `eyJ...`) | ✅ **ESTAS** |
| `S3 Storage URL`, `S3 Access Key`, `S3 Secret Key` (`.../storage/v1/s3`, hex corto) | ❌ NO |

Si por error pegas las de **S3**, la app falla con un XML de Amazon:
`AccessDenied / Missing signature`. Usa siempre:

- `NEXT_PUBLIC_SUPABASE_URL` = la **API URL** → `http://127.0.0.1:54321` (sin `/storage/v1/s3`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = el **anon key** (`eyJ...`)
- `SUPABASE_SERVICE_ROLE_KEY` = el **service_role key** (`eyJ...`)

> Estas 3 keys locales son las demo estándar de Supabase (iguales en toda instalación
> local) — no son secretas.

---

## 3. Crear el `.env.local`

```bash
cp .env.example .env.local
```

Ábrelo y ve llenando los 11 valores conforme avanzas. De una vez pega las 3 de Supabase
(punto 2). El resto sale en los pasos 4–7.

---

## 4. Google / Gmail (para leer Yape)

1. **console.cloud.google.com** → crea un proyecto nuevo (ej. `finanzas-correo`).
   ⚠️ Un proyecto nuevo y dedicado es lo recomendado (no reuses uno viejo).
2. **APIs y servicios → Biblioteca** → busca **Gmail API** → **Habilitar**.
3. **Pantalla de consentimiento de OAuth** (en la consola nueva: *Google Auth Platform*):
   - Tipo **Externo**, en modo **Testing** (no la publiques).
   - ⚠️ **OJO — usuario de prueba obligatorio:** en la pestaña **Público** / *Audience*,
     agrega **tu propio Gmail** en "Usuarios de prueba". Si no lo haces, al autorizar
     sale `Error 403: access_denied` ("solo los verificadores aprobados pueden acceder").
   - **Acceso a datos** → **Agregar o quitar permisos** → como `gmail.readonly` es
     sensible, usa **"Agregar permisos manualmente"** y pega:
     `https://www.googleapis.com/auth/gmail.readonly`
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.**
   En **URIs de redirección autorizados** pon EXACTAMENTE:
   `http://localhost:3000/oauth/google/callback`
5. Copia a `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. Con esos dos pegados y **sin `pnpm dev` corriendo** (este script usa el puerto 3000):
   ```bash
   pnpm auth:google
   ```
   - Se abre el navegador. ⚠️ Aparecerá **"Google no verificó esta app"** → clic en
     **Configuración avanzada** → **Ir a … (no seguro)** → acepta el permiso de lectura.
   - La terminal imprime `GOOGLE_REFRESH_TOKEN=...`. Pégalo en `.env.local`.

> ⚠️ **OJO (Windows):** el auto-abrir del navegador se rompía porque `cmd` cortaba la URL
> en el primer `&` (salía `Required parameter is missing: response_type`). Ya está
> arreglado en el repo. Si aun así falla, **copia la URL completa** que imprime la
> terminal y pégala a mano en el navegador.

---

## 5. Microsoft / Outlook (para leer BCP)

⚠️ **OJO — cambio grande vs el plan original:** una cuenta personal de Microsoft
**ya no puede registrar apps sin un "directorio"** (Microsoft deprecó eso). Verás:
*"La capacidad de crear aplicaciones fuera de un directorio está en desuso"*.

**Solución (gratis):** entra a **https://azure.microsoft.com/free** con tu Hotmail y
completa el registro de Azure Free (da $200 de crédito que NO usarás; lo importante es
que **te crea un directorio**). Alternativa sin tarjeta: **https://entra.microsoft.com**
→ *Administrar inquilinos* → *Crear* un directorio Entra ID.

Ya con directorio:

1. **portal.azure.com** (o entra.microsoft.com) → **Registros de aplicaciones** →
   **Nuevo registro**.
2. Nombre: `finanzas-correo`. **Tipos de cuenta compatibles:**
   **"Cuentas solo en directorios personales de Microsoft"** (cuentas personales).
3. **URI de redirección** → plataforma **Web** → `http://localhost:3000/oauth/ms/callback`
   → **Registrar**. El **Id. de aplicación (cliente)** de la pantalla *Información
   general* es tu `MS_CLIENT_ID`.
4. **Permisos de API** → **Agregar permiso** → **Microsoft Graph** → **Delegados** →
   agrega **`Mail.Read`** y **`offline_access`**. (No hace falta consentimiento de admin.)
5. **Certificados y secretos** → **Nuevo secreto de cliente** → ⚠️ copia el **Valor**
   (NO el "Id."; el Valor se oculta si sales de la pantalla) → ese es `MS_CLIENT_SECRET`.
6. En `.env.local`:
   ```
   MS_CLIENT_ID=...
   MS_CLIENT_SECRET=...
   MS_TENANT_ID=consumers   # dejar así (cuentas personales)
   ```
7. Con eso pegado y **sin `pnpm dev` corriendo**:
   ```bash
   pnpm auth:ms
   ```
   Autoriza con tu Hotmail y pega el `MS_REFRESH_TOKEN=...` que imprime.

> El mismo fix de la URL en Windows del punto 4 aplica aquí.

---

## 6. Anthropic + secreto de la app

1. **console.anthropic.com** → **API Keys** → **Create Key**, cárgale unos dólares.
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   (Solo se usa para el chat de IA del dashboard; el resto funciona sin esto.)
2. Genera el `INGEST_SECRET` (un string aleatorio largo):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   (o `openssl rand -hex 32` si tienes OpenSSL). Pégalo:
   ```
   INGEST_SECRET=el-string-que-salió
   ```

---

## 7. Encender y probar

Con Supabase corriendo:

```bash
pnpm dev
```

Abre `http://localhost:3000` → verás el dashboard vacío. En **otra terminal** (deja
`pnpm dev` corriendo), dispara la ingesta:

```bash
pnpm poll
```

⚠️ `pnpm poll` le pega a `http://localhost:3000/api/ingest`, así que **necesita
`pnpm dev` corriendo**. Devuelve un JSON tipo:

```json
{ "ok": true, "inserted": 40, "skipped": 0,
  "sources": { "yape-egreso": { "fetched": 48, "inserted": 40 }, ... } }
```

Refresca el navegador y aparecen tus movimientos.

---

## 8. Cosas que aprendimos (gotchas ya resueltos)

- ⚠️ **Gmail y `after:0`:** en la primera corrida (sin estado previo) el filtro de fecha
  arrancaba en 1970 → `after:0`, y **Gmail devuelve 0 resultados** con ese valor. Por eso
  Yape traía `fetched: 0` aunque los correos existían. Arreglado en `src/lib/gmail.ts`
  (se omite el filtro cuando no hay fecha previa). BCP no sufría esto porque usa la API de
  Microsoft Graph.
- **Ingesta incremental:** cada fuente guarda su `last_seen_at` en la tabla `email_state`.
  Las corridas siguientes solo traen correos **nuevos**. Para re-leer todo desde cero,
  borra las filas de esa fuente en `email_state` (Supabase Studio: `http://localhost:54323`).
- **Yape entrante vs saliente:** los correos de `notificaciones@yape.pe` que dicen
  *"Acabas de yapear"* son egresos (tú envías). La fuente `yape-ingreso` busca
  *"te han yapeado"*; si nunca te yapean, saldrá 0 (normal).
- **Categorías flojas:** casi todo cae en "Sin categoría" y es esperable — Yape trae
  **nombres de personas** y BCP trae **códigos de comercio** (`TELE000…`, `MOVI000…`), no
  nombres legibles, así que el emparejamiento por palabra clave casi no engancha. Se
  categoriza a mano en el dashboard, o se mejora el categorizador
  (`src/lib/categorize.ts`) / se usa la IA.
- **Ajuste de parsers (si algún día cambian los correos):** las expresiones están en
  `src/lib/parsers/yape.ts` y `src/lib/parsers/bcp.ts`; la config de fuentes
  (remitente / texto que confirma la dirección) está en
  `supabase/migrations/0002_seed_sources.sql` (tabla `sources`).

---

## 9. Arranque automático en VS Code (opcional)

El repo trae `.vscode/tasks.json`: al **abrir la carpeta** en VS Code ejecuta en cadena
**Docker → Supabase → `pnpm dev` (espera al "Ready") → `pnpm poll`**. La primera vez VS
Code pide permiso: `Ctrl+Shift+P` → **Tasks: Manage Automatic Tasks** →
**Allow Automatic Tasks in Folder**. Para leer correos sin reiniciar, corre la tarea
**"Poll: leer correos (manual)"**.

---

## Resumen del `.env.local` — 11 valores

| # | Variable | De dónde sale |
|---|---|---|
| 1-3 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `supabase start` (grupo **API**, no S3) |
| 4-6 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Google Cloud + `pnpm auth:google` |
| 7-10 | `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REFRESH_TOKEN` | Azure/Entra + `pnpm auth:ms` |
| 11 | `ANTHROPIC_API_KEY` | console.anthropic.com |
| + | `INGEST_SECRET` | lo generas tú (`node -e "…randomBytes…"`) |

> `.env.local` está en `.gitignore` — **nunca** se sube al repo. Cada dev pone sus propias
> credenciales.
