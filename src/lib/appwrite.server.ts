// Appwrite server-side access. Uses plain fetch (Worker-safe) instead of the
// node-appwrite SDK. Credentials live in server-only secrets.

export type AppwriteCreds = {
  endpoint: string;
  projectId: string;
  apiKey: string;
};

export function appwriteCreds(): AppwriteCreds {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Appwrite is not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.",
    );
  }
  return { endpoint: endpoint.replace(/\/$/, ""), projectId, apiKey };
}

/** Authenticated request against the Appwrite REST API. */
export async function appwriteFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { endpoint, projectId, apiKey } = appwriteCreds();
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", projectId);
  headers.set("X-Appwrite-Key", apiKey);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${endpoint}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });
}

export async function appwriteJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await appwriteFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Appwrite ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
