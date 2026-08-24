// Browser-side Appwrite client. Endpoint + project id are publishable values.
import { Account, Client, Databases, ID } from "appwrite";

export const APPWRITE_ENDPOINT =
  import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID =
  import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "6a86af62002d1de843de";

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const appwriteAccount = new Account(appwriteClient);
export const appwriteDatabases = new Databases(appwriteClient);

/** Ping the Appwrite backend to verify connectivity (called on app start). */
export async function appwritePing(): Promise<boolean> {
  try {
    await appwriteClient.ping();
    return true;
  } catch {
    return false;
  }
}

export type AppwriteUser = {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
};

export async function appwriteGetUser(): Promise<AppwriteUser | null> {
  try {
    return (await appwriteAccount.get()) as unknown as AppwriteUser;
  } catch {
    return null;
  }
}

export async function appwriteSignUp(email: string, password: string, name?: string) {
  await appwriteAccount.create(ID.unique(), email, password, name);
  return appwriteSignIn(email, password);
}

export async function appwriteSignIn(email: string, password: string) {
  await appwriteAccount.createEmailPasswordSession(email, password);
  return appwriteGetUser();
}

export async function appwriteSignOut() {
  try {
    await appwriteAccount.deleteSession("current");
  } catch {
    /* already signed out */
  }
}

/** Google OAuth via Appwrite, returning to the given same-origin path. */
export function appwriteOAuthGoogle(redirectPath = "/studio?screen=dashboard") {
  const origin = window.location.origin;
  appwriteAccount.createOAuth2Session(
    "google" as never,
    `${origin}${redirectPath}`,
    `${origin}/auth?error=oauth`,
  );
}

/** Short-lived JWT for authenticating server calls as this Appwrite user. */
export async function appwriteJwt(): Promise<string | null> {
  try {
    const { jwt } = await appwriteAccount.createJWT();
    return jwt;
  } catch {
    return null;
  }
}
