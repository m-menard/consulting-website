import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { formatInTimeZone } from "date-fns-tz";

/** Default spreadsheet from client intake form (gid=0). Override with GOOGLE_SHEETS_SPREADSHEET_ID. */
export const DEFAULT_INTAKE_SPREADSHEET_ID =
  "1B7mr3vtUZIl5kuzcK0GokCrqGhzaDJFT4sDAkRSS5QQ";

const EST_TIMEZONE = "America/New_York";

const HEADER_ROW = [
  "Date (EST)",
  "Name",
  "Email",
  "Phone",
  "LinkedIn URL",
  "Company Description",
  "Industry",
  "Company Size",
  "Main Problem",
  "Obstacles",
  "AI Goals",
  "Ideal Outcome",
  "Budget",
  "Timeline",
] as const;

export interface IntakeSheetPayload {
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  companyDescription?: string;
  industry: string;
  companySize?: string;
  mainProblem: string;
  obstacles: string;
  aiGoalsLabel: string;
  idealOutcome?: string;
  budgetLabel?: string;
  timelineLabel?: string;
}

export function formatIntakeDateEst(date = new Date()): string {
  return `${formatInTimeZone(date, EST_TIMEZONE, "yyyy-MM-dd HH:mm:ss")} EST`;
}

function getSpreadsheetId(): string {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEFAULT_INTAKE_SPREADSHEET_ID;
}

function quoteSheetTabForRange(tabName: string): string {
  if (/^[A-Za-z0-9_]+$/.test(tabName)) return tabName;
  return `'${tabName.replace(/'/g, "''")}'`;
}

function getConfiguredSheetName(): string | undefined {
  const name = process.env.GOOGLE_SHEETS_TAB_NAME?.trim();
  return name || undefined;
}

let resolvedSheetTab: string | null = null;

async function resolveSheetTab(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<string> {
  const configured = getConfiguredSheetName();
  if (configured) return configured;

  if (resolvedSheetTab) return resolvedSheetTab;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const title = meta.data.sheets?.[0]?.properties?.title;
  if (!title) {
    throw new Error("Spreadsheet has no tabs");
  }
  resolvedSheetTab = title;
  return title;
}

function credentialsFromParsedJson(parsed: {
  client_email?: string;
  private_key?: string;
}): { client_email: string; private_key: string } | null {
  if (parsed.client_email && parsed.private_key) {
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

function parseServiceAccountCredentials(): {
  client_email: string;
  private_key: string;
} | null {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    try {
      const resolved = path.isAbsolute(credPath)
        ? credPath
        : path.resolve(process.cwd(), credPath);
      const raw = fs.readFileSync(resolved, "utf8");
      const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
      const creds = credentialsFromParsedJson(parsed);
      if (creds) return creds;
    } catch (error) {
      console.error("[Intake Sheets] Failed to read GOOGLE_APPLICATION_CREDENTIALS file:", error);
    }
  }

  const jsonRaw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { client_email?: string; private_key?: string };
      const creds = credentialsFromParsedJson(parsed);
      if (creds) return creds;
    } catch {
      console.error("[Intake Sheets] Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON");
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function isIntakeSheetsConfigured(): boolean {
  return parseServiceAccountCredentials() !== null;
}

function buildRow(payload: IntakeSheetPayload): string[] {
  return [
    formatIntakeDateEst(),
    payload.name,
    payload.email,
    payload.phone ?? "",
    payload.linkedinUrl ?? "",
    payload.companyDescription ?? "",
    payload.industry,
    payload.companySize ?? "",
    payload.mainProblem,
    payload.obstacles,
    payload.aiGoalsLabel,
    payload.idealOutcome ?? "",
    payload.budgetLabel ?? "",
    payload.timelineLabel ?? "",
  ];
}

let headersEnsured = false;

export async function appendIntakeToGoogleSheet(
  payload: IntakeSheetPayload
): Promise<void> {
  const credentials = parseServiceAccountCredentials();
  if (!credentials) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSpreadsheetId();
  const sheetTab = await resolveSheetTab(sheets, spreadsheetId);
  const sheetRangePrefix = quoteSheetTabForRange(sheetTab);
  const headerRange = `${sheetRangePrefix}!A1:N1`;
  const appendRange = `${sheetRangePrefix}!A:N`;

  if (!headersEnsured) {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const firstCell = existing.data.values?.[0]?.[0];
    if (firstCell !== HEADER_ROW[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: { values: [HEADER_ROW.slice()] },
      });
    }
    headersEnsured = true;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: appendRange,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [buildRow(payload)] },
  });
}
