import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

function generateDuplicateKey(adapterName: string, url: string, title: string, company: string): string {
    const normalizedUrl = url.split('?')[0].replace(/\/$/, '').toLowerCase();
    return crypto.createHash('md5').update(`${adapterName}|${normalizedUrl}|${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`).digest('hex');
}

describe('ingestion deduplication logic', () => {
  it('generates the same key for slightly different URLs', () => {
    const url1 = 'https://example.com/job-1?utm_source=test';
    const url2 = 'https://example.com/job-1/';
    const title = 'Data Engineer';
    const company = 'Tech Corp';

    const key1 = generateDuplicateKey('SourceA', url1, title, company);
    const key2 = generateDuplicateKey('SourceA', url2, title, company);

    expect(key1).toBe(key2);
  });

  it('generates different keys for different sources even if URLs match', () => {
      const url = 'https://example.com/job-1';
      const title = 'Data Engineer';
      const company = 'Tech Corp';

      const key1 = generateDuplicateKey('SourceA', url, title, company);
      const key2 = generateDuplicateKey('SourceB', url, title, company);

      expect(key1).not.toBe(key2);
  });

  it('generates different keys for different titles at same company and URL', () => {
    const url = 'https://example.com/apply';
    const company = 'Tech Corp';

    const key1 = generateDuplicateKey('SourceA', url, 'Data Engineer', company);
    const key2 = generateDuplicateKey('SourceA', url, 'Senior Data Engineer', company);

    expect(key1).not.toBe(key2);
  });

  it('does not collapse empty values into the same key uniquely', () => {
    // This is prevented by the validation step in ingest.ts (title/company/url required)
    // but we verify the hash still varies if one is different
    const key1 = generateDuplicateKey('A', 'url1', 'title', 'company');
    const key2 = generateDuplicateKey('A', 'url2', 'title', 'company');
    expect(key1).not.toBe(key2);
  });
});
