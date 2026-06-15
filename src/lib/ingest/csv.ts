import Papa from "papaparse";

export interface CsvResult {
  rows: Record<string, string>[];
  warnings: string[];
}

const MAX_REPORTED_ERRORS = 5;

/**
 * Shared CSV entry point: strips the UTF-8 BOM, trims headers (one file has
 * a trailing space in 'Signal strength '), tolerates quoted embedded commas
 * and skips blank lines. Field-count mismatches (older exports occasionally
 * leave a comma unquoted) are folded into one calm note instead of being
 * reported per row.
 */
export function parseCsv(text: string): CsvResult {
  const clean = text.replace(/^\uFEFF/, "");
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  // A FieldMismatch means a row parsed with more/fewer fields than the header —
  // typically an older export that left a comma unquoted (e.g. a 'Audible,iPhone'
  // manufacturer). We read those rows leniently anyway, so fold the per-row noise
  // into one calm note and keep genuine parse errors (bad quotes, etc.) per row.
  const fieldMismatches = result.errors.filter((error) => error.type === "FieldMismatch");
  const otherErrors = result.errors.filter((error) => error.type !== "FieldMismatch");

  const warnings = otherErrors.slice(0, MAX_REPORTED_ERRORS).map((error) => `row ${error.row ?? "?"}: ${error.message}`);
  if (otherErrors.length > MAX_REPORTED_ERRORS) {
    warnings.push(`…and ${otherErrors.length - MAX_REPORTED_ERRORS} more parse warnings`);
  }
  if (fieldMismatches.length > 0) {
    const n = fieldMismatches.length;
    warnings.push(`${n} row${n === 1 ? "" : "s"} had an unexpected field count (an older export likely left a comma unquoted); read leniently`);
  }

  return { rows: result.data, warnings };
}
