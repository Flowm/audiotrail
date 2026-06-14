import Papa from "papaparse";

export interface CsvResult {
  rows: Record<string, string>[];
  warnings: string[];
}

const MAX_REPORTED_ERRORS = 5;

/**
 * Shared CSV entry point: strips the UTF-8 BOM, trims headers (one file has
 * a trailing space in 'Signal strength '), tolerates quoted embedded commas
 * and skips blank lines.
 */
export function parseCsv(text: string): CsvResult {
  const clean = text.replace(/^\uFEFF/, "");
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const warnings = result.errors.slice(0, MAX_REPORTED_ERRORS).map((error) => `row ${error.row ?? "?"}: ${error.message}`);
  if (result.errors.length > MAX_REPORTED_ERRORS) {
    warnings.push(`…and ${result.errors.length - MAX_REPORTED_ERRORS} more parse warnings`);
  }

  return { rows: result.data, warnings };
}
