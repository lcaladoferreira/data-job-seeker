import { describe, it, expect } from 'vitest';
import { evaluateWorldwideEligibility } from '../worldwide-filter';

describe('worldwide-filter strict gatekeeper', () => {
  it('accepts valid worldwide data engineer roles', () => {
    const result = evaluateWorldwideEligibility(
      'Senior Data Engineer',
      'Remote Worldwide',
      'We are looking for a Data Engineer to work from anywhere in the world.'
    );
    expect(result.status).toBe('ACCEPTED');
    expect(result.matchedRoleKeywords).toContain('Senior Data Engineer');
  });

  it('rejects irrelevant roles even if remote worldwide', () => {
    const result = evaluateWorldwideEligibility(
      'Video Editor',
      'Remote Worldwide',
      'Join us as a video editor.'
    );
    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe('EXCLUDED_ROLE');
  });

  it('rejects data analyst roles', () => {
    const result = evaluateWorldwideEligibility(
       'Senior Data Analyst',
       'Remote Worldwide',
       'Analyze our data.'
    );
    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe('EXCLUDED_ROLE');
  });

  it('rejects region-restricted data engineer roles', () => {
    const result = evaluateWorldwideEligibility(
      'Data Engineer',
      'Remote US Only',
      'Must reside in the US.'
    );
    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe('LOCAL_RESTRICTION');
  });

  it('rejects roles with no worldwide evidence', () => {
     const result = evaluateWorldwideEligibility(
        'Data Engineer',
        'Remote',
        'Working on our data platform.'
     );
     expect(result.status).toBe('REJECTED');
     expect(result.rejectionReason).toBe('NO_WORLDWIDE_EVIDENCE');
  });
});
