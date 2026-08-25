import { stripHtml } from "@/lib/html";
import type { IncomingEmail } from "@/lib/gmail";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const GRAPH_SCOPE = "https://graph.microsoft.com/Mail.Read offline_access";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT_ID || "consumers";
  const refreshToken = process.env.MS_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan MS_CLIENT_ID / MS_CLIENT_SECRET / MS_REFRESH_TOKEN en .env.local"
    );
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: GRAPH_SCOPE,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Microsoft token error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface GraphMessage {
  id: string;
  receivedDateTime: string;
  from?: { emailAddress?: { address?: string } };
  body?: { contentType?: string; content?: string };
}

export async function fetchGraph(from: string, sinceIso: string): Promise<IncomingEmail[]> {
  const token = await getAccessToken();
  const since = new Date(sinceIso).toISOString();

  // Filtrar solo por fecha en el servidor y por remitente en el cliente:
  // combinar from + receivedDateTime en $filter suele fallar en Graph
  // ("restriction or sort order is too complex").
  const emails: IncomingEmail[] = [];
  let url: string | null =
    `${GRAPH_API}/me/messages?` +
    new URLSearchParams({
      $filter: `receivedDateTime gt ${since}`,
      $orderby: "receivedDateTime desc",
      $top: "50",
      $select: "id,from,subject,receivedDateTime,body",
    }).toString();

  let pages = 0;
  while (url && pages < 10) {
    const res: Response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Graph error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      value: GraphMessage[];
      "@odata.nextLink"?: string;
    };
    for (const msg of data.value ?? []) {
      const sender = msg.from?.emailAddress?.address?.toLowerCase();
      if (sender !== from.toLowerCase()) continue;
      const content = msg.body?.content ?? "";
      emails.push({
        id: msg.id,
        text: msg.body?.contentType === "html" ? stripHtml(content) : content,
        receivedAt: msg.receivedDateTime,
      });
    }
    url = data["@odata.nextLink"] ?? null;
    pages++;
  }
  return emails;
}
