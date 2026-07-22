import { OAuth2Client } from "google-auth-library";
import {
  getUserByEmail,
  updateUserGoogleTokens,
  type UserRecord,
} from "./db";

function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new OAuth2Client(clientId, clientSecret);
}

function isTokenExpired(user: UserRecord): boolean {
  if (!user.googleTokenExpires) return true;
  return Date.now() >= user.googleTokenExpires * 1000 - 60_000;
}

export async function getUserAccessToken(email: string): Promise<string> {
  const user = getUserByEmail(email);
  if (!user?.googleRefreshToken) {
    throw new Error("Google account not linked. Sign in again.");
  }

  if (user.googleAccessToken && !isTokenExpired(user)) {
    return user.googleAccessToken;
  }

  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    access_token: user.googleAccessToken ?? undefined,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpires
      ? user.googleTokenExpires * 1000
      : undefined,
  });

  const { credentials } = await oauth2.refreshAccessToken();
  const accessToken = credentials.access_token;

  if (!accessToken) {
    throw new Error("Failed to refresh Google access token. Sign in again.");
  }

  updateUserGoogleTokens(email, {
    accessToken,
    refreshToken: credentials.refresh_token ?? user.googleRefreshToken,
    expiresAt: credentials.expiry_date
      ? Math.floor(credentials.expiry_date / 1000)
      : null,
  });

  return accessToken;
}
