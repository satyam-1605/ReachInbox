import Papa from 'papaparse';

export interface CsvParseResult {
  validEmails: string[];
  invalidRows: string[];
  totalParsed: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pure function to parse CSV raw text into a list of deduplicated, validated email addresses.
 */
export function parseLeadsCsv(rawCsvText: string): CsvParseResult {
  if (!rawCsvText || !rawCsvText.trim()) {
    return { validEmails: [], invalidRows: [], totalParsed: 0 };
  }

  const parsed = Papa.parse<string[]>(rawCsvText.trim(), {
    skipEmptyLines: true,
  });

  const validEmailsSet = new Set<string>();
  const invalidRows: string[] = [];
  let totalParsed = 0;

  for (const row of parsed.data) {
    if (!row || row.length === 0) continue;

    // Check each column in row in case email is in column 0 or any column
    let foundEmailInRow: string | null = null;

    for (const cell of row) {
      if (typeof cell !== 'string') continue;
      const trimmed = cell.trim();
      // Skip header words like 'email', 'e-mail', 'recipient'
      if (['email', 'e-mail', 'recipient', 'leads'].includes(trimmed.toLowerCase())) {
        continue;
      }
      if (EMAIL_REGEX.test(trimmed)) {
        foundEmailInRow = trimmed.toLowerCase();
        break;
      }
    }

    totalParsed++;

    if (foundEmailInRow) {
      validEmailsSet.add(foundEmailInRow);
    } else {
      // Row had content but no valid email
      const rawRowStr = row.join(', ').trim();
      if (
        rawRowStr &&
        !['email', 'e-mail', 'recipient', 'leads'].includes(rawRowStr.toLowerCase())
      ) {
        invalidRows.push(rawRowStr);
      }
    }
  }

  return {
    validEmails: Array.from(validEmailsSet),
    invalidRows,
    totalParsed,
  };
}

