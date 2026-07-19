import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";

function resolveKeyFile(): string | undefined {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) return undefined;

  const resolved = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);

  try {
    const stat = fs.statSync(resolved);
    if (stat.isFile() && stat.size > 0) {
      return resolved;
    }
  } catch {
    // Missing or unreadable key file — fall back to ADC.
  }

  return undefined;
}

export function getGoogleAuth(scopes: string[]): GoogleAuth {
  const keyFile = resolveKeyFile();
  if (keyFile) {
    return new GoogleAuth({ keyFile, scopes });
  }
  return new GoogleAuth({ scopes });
}
