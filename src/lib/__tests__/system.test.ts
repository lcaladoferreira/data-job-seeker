import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runIngestion } from '../ingest';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    ingestionRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    job: {
      findFirst: vi.fn(),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'job-1' })),
      update: vi.fn(),
    },
  },
}));

const mockFetchJobs = vi.fn().mockResolvedValue([]);
vi.mock('../adapters/remoteok', () => ({ RemoteOkAdapter: function() { return { name: 'RemoteOK', fetchJobs: mockFetchJobs } } }));
vi.mock('../adapters/remotive', () => ({ RemotiveAdapter: function() { return { name: 'Remotive', fetchJobs: vi.fn().mockResolvedValue([]) } } }));
vi.mock('../adapters/wwr', () => ({ WWRAdapter: function() { return { name: 'WWR', fetchJobs: vi.fn().mockResolvedValue([]) } } }));
vi.mock('../adapters/jobicy', () => ({ JobicyAdapter: function() { return { name: 'Jobicy', fetchJobs: vi.fn().mockResolvedValue([]) } } }));
vi.mock('../adapters/arbeitnow', () => ({ ArbeitnowAdapter: function() { return { name: 'Arbeitnow', fetchJobs: vi.fn().mockResolvedValue([]) } } }));
vi.mock('../adapters/hackernews', () => ({ HackerNewsAdapter: function() { return { name: 'HackerNews', fetchJobs: vi.fn().mockResolvedValue([]) } } }));

vi.mock('../notifications/slack', () => ({ sendSlackNotification: vi.fn() }));
vi.mock('../notifications/email', () => ({
  sendEmailNotification: vi.fn(),
  sendEmailDigest: vi.fn()
}));

describe('System Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists rejected jobs with rejectionReason', async () => {
    mockFetchJobs.mockResolvedValueOnce([{
      applyUrl: 'https://example.com/rejected',
      title: 'US Only',
      company: 'BadCorp',
      descriptionText: 'Remote in US only',
      sourceName: 'RemoteOK',
      sourceType: 'API',
      remote: true,
    }]);

    await runIngestion();

    expect(prisma.job.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        worldwideStatus: 'REJECTED',
        rejectionReason: expect.any(String)
      })
    }));
  });

  it('persists accepted jobs with worldwideEvidence', async () => {
    mockFetchJobs.mockResolvedValueOnce([{
      applyUrl: 'https://example.com/accepted',
      title: 'Senior Data Engineer',
      company: 'GoodCorp',
      descriptionText: 'Remote Worldwide. SQL, Python, Spark.',
      sourceName: 'RemoteOK',
      sourceType: 'API',
      remote: true,
    }]);

    await runIngestion();

    expect(prisma.job.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        worldwideStatus: 'ACCEPTED',
        worldwideEvidence: expect.arrayContaining(['Remote Worldwide'])
      })
    }));
  });

  it('does not alert duplicate jobs twice', async () => {
    mockFetchJobs.mockResolvedValueOnce([{
      applyUrl: 'https://example.com/duplicate',
      title: 'Senior Data Engineer',
      company: 'GoodCorp',
      descriptionText: 'Remote Worldwide. SQL, Python, Spark.',
      sourceName: 'RemoteOK',
      sourceType: 'API',
      remote: true,
    }]);

    (prisma.job.findFirst as any).mockResolvedValueOnce({ id: 'existing-id' });

    await runIngestion();

    expect(prisma.job.create).not.toHaveBeenCalled();
    expect(prisma.job.update).toHaveBeenCalled();
  });
});
