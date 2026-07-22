export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function parseDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
