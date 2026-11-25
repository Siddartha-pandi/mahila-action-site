/**
 * Sanitizes and RFC-4180 quotes a single CSV cell value to prevent
 * spreadsheet formula injection (=, +, -, @, tab, CR) in Excel/Sheets.
 */
export function csvCell(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  let s = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Formats headers and rows into a UTF-8 BOM-prefixed CSV string.
 */
export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => csvCell(h)).join(",");
  const rowLines = rows.map((row) => row.map((cell) => csvCell(cell)).join(","));
  return "\uFEFF" + [headerLine, ...rowLines].join("\n");
}
