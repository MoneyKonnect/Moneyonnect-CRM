import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export function getGoogleAuth() {
  return new GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      token_uri: "https://oauth2.googleapis.com/token",
    } as any,
    scopes: SCOPES,
  });
}

export async function sheetsRequest(auth: GoogleAuth, method: string, url: string, body?: any) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Sheets API error: ${res.status} ${err}`); }
  return res.json();
}

export async function driveRequest(auth: GoogleAuth, method: string, url: string, body?: any) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`Drive API error: ${res.status} ${err}`); }
  return res.json();
}
