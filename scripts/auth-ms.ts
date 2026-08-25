// Obtiene MS_REFRESH_TOKEN (Microsoft Graph, cuenta personal Outlook/Hotmail).
// Uso: pnpm auth:ms   (detén `pnpm dev` primero: este script usa el puerto 3000)
//
// Nota: se usa el flujo OAuth "authorization code" a mano (fetch) en vez de
// @azure/msal-node porque MSAL oculta el refresh token en su caché interna
// y aquí necesitamos imprimirlo para pegarlo en .env.local.
import http from "node:http";
import { spawn } from "node:child_process";
import { loadEnvLocal, requireEnv } from "./env";

loadEnvLocal();
requireEnv("MS_CLIENT_ID", "MS_CLIENT_SECRET");

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/ms/callback`;
const TENANT = process.env.MS_TENANT_ID || "consumers";
const SCOPE = "offline_access https://graph.microsoft.com/Mail.Read";

const authUrl =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?` +
  new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID!,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: SCOPE,
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname !== "/oauth/ms/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end(`Error: ${url.searchParams.get("error_description") ?? "sin code"}`);
    return;
  }
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MS_CLIENT_ID!,
          client_secret: process.env.MS_CLIENT_SECRET!,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
          scope: SCOPE,
        }),
      }
    );
    const tokens = (await tokenRes.json()) as {
      refresh_token?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokens.refresh_token) {
      throw new Error(tokens.error_description ?? `HTTP ${tokenRes.status}`);
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<h2>Listo ✓</h2><p>Vuelve a la terminal y copia el refresh token.</p>");
    console.log("\n================================================");
    console.log("MS_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("================================================");
    console.log("Pégalo en .env.local y ya puedes correr la ingesta.");
  } catch (err) {
    res.writeHead(500).end("Error intercambiando el código; mira la terminal.");
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("Abre esta URL en tu navegador y autoriza el acceso:\n");
  console.log(authUrl + "\n");
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(opener, [authUrl], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).on(
    "error",
    () => {}
  );
});
