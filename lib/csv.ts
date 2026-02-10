import { generateFormulas, type PeriodMode, type Separator } from "./formulas";

const OUTPUT_DELIMITER = ";";

const HEADERS = [
  "companyname",
  "capital_iq_ticker",
  "revenue_latest",
  "ebit_latest",
  "ebitda_latest",
] as const;

/**
 * Escape a value for inclusion in a semicolon-delimited CSV cell.
 *
 * Rules:
 * - If the value contains the delimiter, a double-quote, or a newline,
 *   wrap it in double-quotes and double any internal quotes.
 * - Formula cells (starting with "=") are always quoted so the semicolons
 *   inside formulas don't break columns.
 */
export function escapeCell(value: string): string {
  const needsQuoting =
    value.startsWith("=") ||
    value.includes(OUTPUT_DELIMITER) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (!needsQuoting) return value;

  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Parse raw text input (one company name per line) into a cleaned array.
 *
 * @param text        - Raw textarea content
 * @param deduplicate - Whether to remove duplicate names
 */
export function parseNames(text: string, deduplicate: boolean): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!deduplicate) return lines;

  const seen = new Set<string>();
  return lines.filter((name) => {
    const lower = name.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

export interface CsvRow {
  companyname: string;
  capital_iq_ticker: string;
  revenue_latest: string;
  ebit_latest: string;
  ebitda_latest: string;
}

/**
 * Build typed row objects from a list of company names.
 *
 * @param names - Cleaned company names
 * @param mode  - Period mode for formulas
 * @param sep   - Formula argument separator
 */
export function buildRows(
  names: string[],
  mode: PeriodMode,
  sep: Separator,
): CsvRow[] {
  return names.map((name, index) => {
    // Excel row: header is row 1, first data row is row 2
    const excelRow = index + 2;
    const formulas = generateFormulas(excelRow, mode, sep);

    return {
      companyname: name,
      capital_iq_ticker: formulas.ticker,
      revenue_latest: formulas.revenue,
      ebit_latest: formulas.ebit,
      ebitda_latest: formulas.ebitda,
    };
  });
}

/**
 * Serialize rows into a semicolon-delimited CSV string.
 */
export function serializeCsv(rows: CsvRow[]): string {
  const headerLine = HEADERS.join(OUTPUT_DELIMITER);

  const dataLines = rows.map((row) =>
    HEADERS.map((h) => escapeCell(row[h])).join(OUTPUT_DELIMITER),
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Full pipeline: raw text -> CSV string.
 */
export function generateCsvFromText(
  text: string,
  mode: PeriodMode,
  sep: Separator,
  deduplicate: boolean,
): string {
  const names = parseNames(text, deduplicate);
  const rows = buildRows(names, mode, sep);
  return serializeCsv(rows);
}

/**
 * Full pipeline: parsed company names (from CSV upload) -> CSV string.
 */
export function generateCsvFromNames(
  names: string[],
  mode: PeriodMode,
  sep: Separator,
  deduplicate: boolean,
): string {
  const cleaned = deduplicate ? deduplicateNames(names) : names;
  const rows = buildRows(cleaned, mode, sep);
  return serializeCsv(rows);
}

function deduplicateNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const lower = name.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

/**
 * Trigger a file download in the browser.
 */
export function downloadCsv(csv: string, filename: string): void {
  // BOM for Excel UTF-8 detection
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
