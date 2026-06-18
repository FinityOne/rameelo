// Dependency-free CSV parsing + flexible header mapping for the admin user import.
// Handles quoted fields, escaped quotes (""), embedded commas/newlines, and CRLF.

export type CsvParsed = { headers: string[]; rows: string[][] };

export function parseCsv(text: string): CsvParsed {
  // Strip a UTF-8 BOM if present (common from Excel exports).
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;         // CRLF
      row.push(field); field = "";
      // Skip fully-blank lines.
      if (!(row.length === 1 && row[0].trim() === "")) rows.push(row);
      row = [];
    } else field += c;
  }
  // Trailing field / row (no final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0].trim() === "")) rows.push(row);
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map(h => h.trim());
  return { headers, rows: rows.slice(1) };
}

// ── Header → field mapping ────────────────────────────────────────────────────
export type ImportField = "first_name" | "last_name" | "email" | "phone" | "city" | "state" | "tags" | "notes";

const ALIASES: Record<ImportField, string[]> = {
  email:      ["email", "email address", "e-mail", "emailaddress", "mail"],
  first_name: ["first name", "firstname", "first", "given name", "fname"],
  last_name:  ["last name", "lastname", "last", "surname", "family name", "lname"],
  phone:      ["phone", "phone number", "phonenumber", "mobile", "cell", "cellphone", "contact", "tel"],
  city:       ["city", "town"],
  state:      ["state", "st", "province", "region"],
  tags:       ["tags", "tag", "groups", "group", "labels", "segment"],
  notes:      ["notes", "note", "comment", "comments", "remarks"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

/** Best-effort map of each detected header (by index) to a known field. */
export function mapHeaders(headers: string[]): (ImportField | null)[] {
  return headers.map(h => {
    const n = norm(h);
    for (const field of Object.keys(ALIASES) as ImportField[]) {
      if (ALIASES[field].includes(n)) return field;
    }
    return null;
  });
}

export type ImportRow = {
  first_name: string; last_name: string; email: string;
  phone: string; city: string; state: string;
  tags: string[]; notes: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Build clean rows from parsed CSV + header map. Returns valid rows (with a real
 *  email) plus counts of skipped (no/invalid email) and within-file duplicates. */
export function buildRows(parsed: CsvParsed): { rows: ImportRow[]; invalid: number; duplicates: number } {
  const map = mapHeaders(parsed.headers);
  const idx = (f: ImportField) => map.indexOf(f);
  const get = (cols: string[], f: ImportField) => { const i = idx(f); return i >= 0 ? (cols[i] ?? "").trim() : ""; };

  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  let invalid = 0, duplicates = 0;

  for (const cols of parsed.rows) {
    const email = get(cols, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) { invalid++; continue; }
    if (seen.has(email)) { duplicates++; continue; }
    seen.add(email);
    const tagsRaw = get(cols, "tags");
    rows.push({
      email,
      first_name: get(cols, "first_name"),
      last_name: get(cols, "last_name"),
      phone: get(cols, "phone").replace(/\D/g, "").slice(0, 10),
      city: get(cols, "city"),
      state: get(cols, "state").toUpperCase().slice(0, 2),
      tags: tagsRaw ? tagsRaw.split(/[;,|]/).map(t => t.trim()).filter(Boolean) : [],
      notes: get(cols, "notes"),
    });
  }
  return { rows, invalid, duplicates };
}

// Template the admin can download to know exactly which columns map to the DB.
export const IMPORT_TEMPLATE_HEADERS = ["first_name", "last_name", "email", "phone", "city", "state", "tags", "notes"];
export function importTemplateCsv(): string {
  const example = ["Priya", "Patel", "priya@example.com", "5551234567", "Edison", "NJ", "vip;navratri-2024", "Met at Diwali mela"];
  const example2 = ["Raj", "Shah", "raj@example.com", "5559876543", "Houston", "TX", "newsletter", ""];
  const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [IMPORT_TEMPLATE_HEADERS, example, example2].map(r => r.map(esc).join(",")).join("\n");
}
