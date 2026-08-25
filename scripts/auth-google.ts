// Obtiene GOOGLE_REFRESH_TOKEN.
// Uso: pnpm auth:google   (detén `pnpm dev` primero: este script usa el puerto 3000)
import http from "node:http";
import { spawn } from "node:child_process";
import { OAuth2Client } from "google-auth-library";
import { loadEnvLocal, requireEnv } from "./env";

loadEnvLocal();
requireEnv("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/google/callback`;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // fuerza a Google a emitir un refresh token nuevo
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname !== "/oauth/google/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Falta ?code en el callback");
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<h2>Listo ✓</h2><p>Vuelve a la terminal y copia el refresh token.</p>");
    console.log("\n================================================");
    console.log("GOOGLE_REFRESH_TOKEN=" + (tokens.refresh_token ?? "(no recibido)"));
    console.log("================================================");
    if (!tokens.refresh_token) {
      console.log(
        "No llegó refresh token: revoca el acceso en https://myaccount.google.com/permissions y vuelve a correr el script."
      );
    } else {
      console.log("Pégalo en .env.local y ya puedes correr la ingesta.");
    }
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
    () => {} // si no se puede abrir solo, el usuario copia la URL
  );
});
