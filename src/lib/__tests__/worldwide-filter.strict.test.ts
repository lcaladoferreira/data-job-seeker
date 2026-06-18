import { describe, it, expect } from 'vitest';
import { evaluateWorldwideEligibility } from '../worldwide-filter';

describe('Strict Worldwide Data Engineer Filter', () => {
  it('REJECTS non-Data Engineer roles even with worldwide evidence', () => {
    const cases = [
      { title: 'Mid/Senior AI Cinematic Video Editor', description: 'Remote Worldwide. Join our team.' },
      { title: 'Designer', description: 'Work from anywhere. We love global talent.' },
      { title: 'Product Manager', description: 'Worldwide remote position.' },
      { title: 'Software Engineer', description: 'Remote globally.' },
      { title: 'Data Scientist', description: 'Anywhere in the world.' },
      { title: 'Data Analyst', description: 'Global remote.' },
      { title: 'Machine Learning Engineer', description: 'Work from anywhere.' },
      { title: 'AI Engineer', description: 'Remote worldwide.' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, 'Remote', c.description);
      expect(result.status).toBe('REJECTED');
      expect(['NOT_A_DATA_ENGINEERING_ROLE', 'EXCLUDED_ROLE']).toContain(result.rejectionReason);
    });
  });

  it('REJECTS local restrictions even for Data Engineers', () => {
    const cases = [
      { title: 'Data Engineer', description: 'Remote Worldwide. US Only.' },
      { title: 'Senior Data Engineer', description: 'Global remote. Must reside in Europe.' },
      { title: 'Staff Data Engineer', description: 'Work from anywhere. Brazil Only.' },
      { title: 'Analytics Engineer', description: 'Worldwide. Visa unavailable.' },
      { title: 'Cloud Data Engineer', description: 'Remote. Authorized to work in Canada required.' },
      { title: 'Data Infrastructure Engineer', description: 'Global. Timezone overlap only with EST.' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, 'Remote', c.description);
      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('LOCAL_RESTRICTION');
    });
  });

  it('REJECTS Data Engineer roles without worldwide evidence', () => {
    const cases = [
      { title: 'Data Engineer', description: 'Join our growing team.' },
      { title: 'Senior Data Engineer', description: 'Remote position available.' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, 'Remote', c.description);
      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('NO_WORLDWIDE_EVIDENCE');
    });
  });

  it('ACCEPTS valid Worldwide Data Engineer roles', () => {
    const cases = [
      { title: 'Data Engineer', description: 'Remote Worldwide. SQL, Python, Spark.' },
      { title: 'Senior Data Engineer', description: 'Global remote. dbt, Snowflake.' },
      { title: 'Staff Data Engineer', description: 'Work from anywhere in the world.' },
      { title: 'Analytics Engineer', description: 'Open to candidates worldwide.' },
      { title: 'Lead Data Engineer', description: 'Distributed globally and hiring worldwide.' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, 'Remote', c.description);
      expect(result.status, `Failed to accept: ${c.title}`).toBe('ACCEPTED');
    });
  });

  it('REJECTS specific city/country mentions in title or location', () => {
    expect(evaluateWorldwideEligibility('Data Engineer', 'São Paulo', 'Worldwide').status).toBe('REJECTED');
    expect(evaluateWorldwideEligibility('Data Engineer (Rio de Janeiro)', 'Remote', 'Global').status).toBe('REJECTED');
    expect(evaluateWorldwideEligibility('Data Engineer', 'UK', 'Anywhere').status).toBe('REJECTED');
  });
});
