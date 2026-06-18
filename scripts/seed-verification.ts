import { prisma } from '../src/lib/prisma';
import { WorldwideStatus } from '@prisma/client';

async function seed() {
  console.log('Seeding jobs for verification...');

  // Clear existing jobs to ensure clean count
  await prisma.job.deleteMany({});

  const jobs = [];
  for (let i = 1; i <= 35; i++) {
    jobs.push({
      sourceName: i % 2 === 0 ? 'RemoteOK' : 'Remotive',
      sourceType: 'API',
      title: `Senior Data Engineer - Global Team ${i}`,
      company: `DataCorp ${i}`,
      location: 'Remote Worldwide',
      remote: true,
      applyUrl: `https://example.com/job-${i}`,
      finalUrl: `https://example.com/job-${i}`,
      descriptionText: 'We are looking for a Senior Data Engineer. This is a Remote Worldwide position. Keywords: SQL, Spark, Python, Airflow.',
      descriptionSnippet: 'We are looking for a Senior Data Engineer...',
      worldwideStatus: 'ACCEPTED' as WorldwideStatus,
      worldwideEvidence: ['Remote Worldwide'],
      matchedKeywords: ['Senior Data Engineer'],
    });
  }

  // Add some rejected ones too for accounting proof
  for (let i = 1; i <= 10; i++) {
    jobs.push({
      sourceName: 'RemoteOK',
      sourceType: 'API',
      title: `AI Video Editor ${i}`,
      company: `VideoCorp ${i}`,
      location: 'Remote',
      remote: true,
      applyUrl: `https://example.com/rejected-${i}`,
      finalUrl: `https://example.com/rejected-${i}`,
      descriptionText: 'Cinematic video editor role.',
      descriptionSnippet: 'Cinematic video editor role...',
      worldwideStatus: 'REJECTED' as WorldwideStatus,
      worldwideEvidence: [],
      rejectionReason: 'EXCLUDED_ROLE',
      matchedRejectPatterns: ['Video Editor'],
    });
  }

  await prisma.job.createMany({ data: jobs });
  console.log('Seed complete. 35 ACCEPTED, 10 REJECTED.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
