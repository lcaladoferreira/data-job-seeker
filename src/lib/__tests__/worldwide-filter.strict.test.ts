import { describe, it, expect } from 'vitest';
import { evaluateWorldwideEligibility } from '../worldwide-filter';

describe('evaluateWorldwideEligibility Strict Validation', () => {
  it('REJECTS non-data engineering roles', () => {
    const cases = [
      { title: 'Mid/Senior AI Cinematic Video Editor', location: 'Remote', description: 'Work from anywhere' },
      { title: 'Staff Product Engineer', location: 'São Paulo', description: 'Remote worldwide' },
      { title: 'Software Engineer', location: 'Remote Brazil', description: 'Global remote' },
      { title: 'Frontend Engineer', location: 'Remote', description: 'Work from anywhere' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, c.location, c.description);
      expect(result.status).toBe('REJECTED');
      expect(['NOT_DATA_ENGINEERING_ROLE', 'EXCLUDED_ROLE', 'LOCAL_RESTRICTION']).toContain(result.rejectionReason);
    });
  });

  it('REJECTS local restrictions even for data roles', () => {
    const cases = [
      { title: 'Data Engineer', location: 'Remote Brazil only', description: 'Worldwide remote' },
      { title: 'Senior Data Engineer', location: 'US Only', description: 'Work from anywhere' },
      { title: 'Analytics Engineer', location: 'Remote', description: 'Must reside in Europe' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, c.location, c.description);
      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('LOCAL_RESTRICTION');
    });
  });

  it('ACCEPTS valid worldwide data engineering jobs', () => {
    const cases = [
      { title: 'Senior Data Engineer', location: 'Remote Worldwide', description: 'SQL, Python, Spark' },
      { title: 'Analytics Engineer', location: 'Remote', description: 'Work from anywhere. dbt, Snowflake, SQL' },
      { title: 'Data Platform Engineer', location: 'Global Remote', description: 'Airflow, Kubernetes, Python' },
      { title: 'PySpark Data Engineer', location: 'Anywhere in the World', description: 'Building data pipelines' },
    ];

    cases.forEach(c => {
      const result = evaluateWorldwideEligibility(c.title, c.location, c.description);
      expect(result.status, `Failed to accept: ${c.title}`).toBe('ACCEPTED');
    });
  });

  it('REJECTS jobs with city names in title or location', () => {
    expect(evaluateWorldwideEligibility('Data Engineer (São Paulo)', 'Remote').status).toBe('REJECTED');
    expect(evaluateWorldwideEligibility('Data Engineer', 'Campinas').status).toBe('REJECTED');
  });

  it('DOES NOT reject common pronouns like "us" or "our" if no restriction', () => {
     const text = "Join us at our company. We offer Remote Worldwide positions for Data Engineers.";
     const result = evaluateWorldwideEligibility('Data Engineer', 'Remote', text);
     expect(result.status).toBe('ACCEPTED');
  });
});
