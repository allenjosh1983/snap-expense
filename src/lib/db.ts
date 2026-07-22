import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export type UserRecord = {
  email: string;
  spreadsheetId: string | null;
  tabName: string;
  driveFolderId: string | null;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpires: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UserSheetConfig = {
  spreadsheetId: string;
  tabName: string;
  driveFolderId?: string;
};

type UserRow = {
  email: string;
  spreadsheet_id: string | null;
  tab_name: string;
  drive_folder_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires: number | null;
  created_at: string;
  updated_at: string;
};

let db: Database.Database | null = null;

function getDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), "data", "users.sqlite");
}

function ensureDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      spreadsheet_id TEXT,
      tab_name TEXT NOT NULL DEFAULT 'Receipts',
      drive_folder_id TEXT,
      google_access_token TEXT,
      google_refresh_token TEXT,
      google_token_expires INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

function rowToUser(row: UserRow): UserRecord {
  return {
    email: row.email,
    spreadsheetId: row.spreadsheet_id,
    tabName: row.tab_name || "Receipts",
    driveFolderId: row.drive_folder_id,
    googleAccessToken: row.google_access_token,
    googleRefreshToken: row.google_refresh_token,
    googleTokenExpires: row.google_token_expires,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUserByEmail(email: string): UserRecord | null {
  const database = ensureDatabase();
  const row = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;

  return row ? rowToUser(row) : null;
}

export function ensureUser(email: string): UserRecord {
  const normalizedEmail = email.toLowerCase();
  const existing = getUserByEmail(normalizedEmail);
  if (existing) return existing;

  const now = new Date().toISOString();
  const database = ensureDatabase();
  database
    .prepare(
      `INSERT INTO users (
        email, spreadsheet_id, tab_name, drive_folder_id,
        google_access_token, google_refresh_token, google_token_expires,
        created_at, updated_at
      ) VALUES (?, NULL, 'Receipts', NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .run(normalizedEmail, now, now);

  return getUserByEmail(normalizedEmail)!;
}

export function updateUserGoogleTokens(
  email: string,
  tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: number | null;
  },
): UserRecord {
  const normalizedEmail = email.toLowerCase();
  ensureUser(normalizedEmail);

  const existing = getUserByEmail(normalizedEmail)!;
  const now = new Date().toISOString();
  const database = ensureDatabase();

  database
    .prepare(
      `UPDATE users SET
        google_access_token = ?,
        google_refresh_token = ?,
        google_token_expires = ?,
        updated_at = ?
      WHERE email = ?`,
    )
    .run(
      tokens.accessToken ?? existing.googleAccessToken,
      tokens.refreshToken ?? existing.googleRefreshToken,
      tokens.expiresAt ?? existing.googleTokenExpires,
      now,
      normalizedEmail,
    );

  return getUserByEmail(normalizedEmail)!;
}

export function updateUserSheetConfig(
  email: string,
  config: {
    spreadsheetId: string;
    tabName: string;
    driveFolderId?: string | null;
  },
): UserRecord {
  const normalizedEmail = email.toLowerCase();
  ensureUser(normalizedEmail);

  const now = new Date().toISOString();
  const database = ensureDatabase();

  database
    .prepare(
      `UPDATE users SET
        spreadsheet_id = ?,
        tab_name = ?,
        drive_folder_id = ?,
        updated_at = ?
      WHERE email = ?`,
    )
    .run(
      config.spreadsheetId,
      config.tabName || "Receipts",
      config.driveFolderId ?? null,
      now,
      normalizedEmail,
    );

  return getUserByEmail(normalizedEmail)!;
}

export function hasSheetConfigured(email: string): boolean {
  const user = getUserByEmail(email);
  return Boolean(user?.spreadsheetId?.trim());
}

export function getUserSheetConfig(email: string): UserSheetConfig | null {
  const user = getUserByEmail(email);
  if (!user?.spreadsheetId?.trim()) return null;

  return {
    spreadsheetId: user.spreadsheetId,
    tabName: user.tabName || "Receipts",
    driveFolderId: user.driveFolderId?.trim() || undefined,
  };
}
