import { describe, it, expect } from 'vitest';
import { parseLeadsCsv } from './csvParser';

describe('CSV Parser (Leads Ingestion)', () => {
  it('should parse valid emails with correct lead count', () => {
    const csvContent = `
email
alice@example.com
bob@reachinbox.ai
charlie@gmail.com
    `;

    const result = parseLeadsCsv(csvContent);

    expect(result.validEmails).toEqual([
      'alice@example.com',
      'bob@reachinbox.ai',
      'charlie@gmail.com',
    ]);
    expect(result.validEmails.length).toBe(3);
    expect(result.invalidRows.length).toBe(0);
  });

  it('should ignore bad or invalid rows while retaining valid ones', () => {
    const csvContent = `
recipient
valid.user@company.com
not-an-email
another.valid@domain.org
12345
bad-format@
    `;

    const result = parseLeadsCsv(csvContent);

    expect(result.validEmails).toEqual([
      'valid.user@company.com',
      'another.valid@domain.org',
    ]);
    expect(result.validEmails.length).toBe(2);
    expect(result.invalidRows).toContain('not-an-email');
    expect(result.invalidRows).toContain('12345');
    expect(result.invalidRows).toContain('bad-format@');
  });

  it('should deduplicate repeated email addresses', () => {
    const csvContent = `
dup@reachinbox.com
DUP@REACHINBOX.COM
dup@reachinbox.com
unique@reachinbox.com
    `;

    const result = parseLeadsCsv(csvContent);

    expect(result.validEmails).toEqual([
      'dup@reachinbox.com',
      'unique@reachinbox.com',
    ]);
    expect(result.validEmails.length).toBe(2);
  });

  it('should return empty results for empty or blank input', () => {
    expect(parseLeadsCsv('')).toEqual({
      validEmails: [],
      invalidRows: [],
      totalParsed: 0,
    });
    expect(parseLeadsCsv('   \n  \n  ')).toEqual({
      validEmails: [],
      invalidRows: [],
      totalParsed: 0,
    });
  });
});

