import { stripHtml } from "@/lib/html";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface IncomingEmail {
  id: string;
  text: string;
  receivedAt: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN en .env.local"
    );
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

// Busca recursivamente la parte text/html (o text/plain como fallback)
function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return "";
  const findPart = (part: GmailPart, mime: string): string | null => {
    if (part.mimeType === mime && part.body?.data) return part.body.data;
    for (const child of part.parts ?? []) {
      const found = findPart(child, mime);
      if (found) return found;
    }
    return null;
  };
  const html = findPart(payload, "text/html");
  if (html) return stripHtml(decodeBase64Url(html));
  const plain = findPart(payload, "text/plain");
  if (plain) return decodeBase64Url(plain);
  if (payload.body?.data) return stripHtml(decodeBase64Url(payload.body.data));
  return "";
}

export async function fetchGmail(from: string, sinceIso: string): Promise<IncomingEmail[]> {
  const token = await getAccessToken();
  const headers = { authorization: `Bearer ${token}` };
  const afterEpoch = Math.max(0, Math.floor(new Date(sinceIso).getTime() / 1000));
  // Gmail devuelve 0 resultados con `after:0` (epoch 1970): en ese caso, en la
  // primera corrida sin estado previo, omitimos el filtro de fecha para traer todo.
  const q = afterEpoch > 0 ? `from:${from} after:${afterEpoch}` : `from:${from}`;

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${GMAIL_API}/messages`);
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Gmail list error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };
    ids.push(...(data.messages ?? []).map((m) => m.id));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const emails: IncomingEmail[] = [];
  for (const id of ids) {
    const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, { headers });
    if (!res.ok) throw new Error(`Gmail get error ${res.status}: ${await res.text()}`);
    const msg = (await res.json()) as {
      id: string;
      internalDate?: string;
      payload?: GmailPart;
    };
    emails.push({
      id: msg.id,
      text: extractBody(msg.payload),
      receivedAt: msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString(),
    });
  }
  return emails;
}
