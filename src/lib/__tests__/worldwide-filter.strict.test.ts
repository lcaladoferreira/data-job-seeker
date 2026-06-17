import { describe, it, expect } from 'vitest';
import { evaluateWorldwideEligibility } from '../worldwide-filter';

describe('evaluateWorldwideEligibility Strict Validation', () => {
  it('REJECTS hard negative cases', () => {
    const negatives = [
      'Remote US only',
      'Remote US/Canada only',
      'Remote Europe only',
      'Remote UK only',
      'Remote EMEA only',
      'Remote APAC only',
      'Remote LATAM only',
      'Remote Brazil only',
      'Remote Americas only',
      'Remote but must reside in Germany',
      'Remote but work authorization required',
      'Eligible locations: US, Canada',
      'This is a remote position', // No explicit worldwide evidence
      'Remote job for candidates in the United States',
      'Remote position for LATAM candidates',
      'Remote, timezone compatibility with EST required',
    ];

    negatives.forEach(text => {
      const result = evaluateWorldwideEligibility(text);
      expect(result.status, `Failed to reject: ${text}`).toBe('REJECTED');
    });
  });

  it('ACCEPTS only explicit worldwide evidence', () => {
    const positives = [
      'Remote Worldwide',
      'Worldwide Remote',
      'Work from anywhere',
      'Anywhere in the world',
      'Open to candidates worldwide',
      'Applicants worldwide',
      'Remote globally',
      'No location restrictions',
      'Location: Worldwide',
      'Distributed globally and hiring worldwide'
    ];

    positives.forEach(text => {
      const result = evaluateWorldwideEligibility(text);
      expect(result.status, `Failed to accept: ${text}`).toBe('ACCEPTED');
    });
  });

  it('REJECTS mixed worldwide + restriction (False Positive Prevention)', () => {
    const mixed = [
      'Remote Worldwide, but must be authorized to work in the US',
      'Work from anywhere, however, we only hire in Europe',
      'Anywhere in the world (US/Canada only)',
      'Global remote. Must reside in Brazil.',
    ];

    mixed.forEach(text => {
      const result = evaluateWorldwideEligibility(text);
      expect(result.status, `Failed to reject mixed: ${text}`).toBe('REJECTED');
    });
  });

  it('DOES NOT reject common pronouns like "us" or "our"', () => {
     const text = "Join us at our company. We offer Remote Worldwide positions.";
     const result = evaluateWorldwideEligibility(text);
     expect(result.status).toBe('ACCEPTED');
     expect(result.matchedRejectPatterns.length).toBe(0);
  });
});
