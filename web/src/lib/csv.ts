// Shared CSV parsing utilities for external POS exports.
// The Vapescrew export uses `;` as the column delimiter (item names contain `,`)
// and `DD/MM/YYYY` dates; older/converted files may use `,` and `DD-MM-YYYY`.
// These helpers auto-detect the delimiter and accept both date separators so a
// single parser works across dialects.

export type CsvDelimiter = ';' | ',';

export function splitCsvLines(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/\r$/, ''));
}

// Pick the delimiter that appears most in the header row.
export function detectDelimiter(headerLine: string): CsvDelimiter {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

// Split one CSV line, honoring quoted fields and escaped double-quotes ("").
export function parseDelimitedLine(line: string, delimiter: CsvDelimiter): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// "07/06/2026" or "30-06-2026" (DD/MM/YYYY) + "20:58:21" → Date (Asia/Jakarta, +07:00).
export function parseDateTime(date: string, time: string): Date | null {
  const parts = date.split(/[/-]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}+07:00`;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? null : parsed;
}
