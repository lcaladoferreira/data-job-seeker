import { prisma } from './prisma';
import { JobAdapter, RawJob } from './adapters/types';
import { RemoteOkAdapter } from './adapters/remoteok';
import { RemotiveAdapter } from './adapters/remotive';
import { WWRAdapter } from './adapters/wwr';
import { JobicyAdapter } from './adapters/jobicy';
import { ArbeitnowAdapter } from './adapters/arbeitnow';
import { HackerNewsAdapter } from './adapters/hackernews';
import { evaluateWorldwideEligibility } from './worldwide-filter';
import { WorldwideStatus } from '@prisma/client';
import { sendSlackNotification } from './notifications/slack';
import { sendEmailNotification } from './notifications/email';

export async function runIngestion() {
  const run = await prisma.ingestionRun.create({
    data: { status: 'RUNNING' },
  });

  const adapters: JobAdapter[] = [
    new RemoteOkAdapter(),
    new RemotiveAdapter(),
    new WWRAdapter(),
    new JobicyAdapter(),
    new ArbeitnowAdapter(),
    new HackerNewsAdapter(),
  ];

  let totalFound = 0, totalAccepted = 0, totalRejected = 0;
  const errors: string[] = [];

  for (const adapter of adapters) {
    try {
      const rawJobs = await adapter.fetchJobs();
      totalFound += rawJobs.length;
      for (const rawJob of rawJobs) {
        const result = await processJob(rawJob);
        if (result === 'ACCEPTED') totalAccepted++;
        if (result === 'REJECTED') totalRejected++;
      }
    } catch (error) {
      errors.push(`Error in adapter ${adapter.name}: ${error}`);
    }
  }

  await prisma.ingestionRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status: errors.length === 0 ? 'SUCCESS' : (errors.length < adapters.length ? 'PARTIAL' : 'FAILED'),
      jobsFound: totalFound,
      jobsAccepted: totalAccepted,
      jobsRejected: totalRejected,
      errorLog: errors.join('\n'),
    },
  });

  return { totalFound, totalAccepted, totalRejected };
}

async function processJob(rawJob: RawJob) {
  const existingJob = await prisma.job.findFirst({
    where: {
      OR: [
        { applyUrl: rawJob.applyUrl },
        { title: rawJob.title, company: rawJob.company }
      ]
    },
  });

  if (existingJob) {
    await prisma.job.update({
      where: { id: existingJob.id },
      data: { lastSeenAt: new Date() },
    });
    return 'EXISTING';
  }

  const evaluation = evaluateWorldwideEligibility(rawJob.descriptionText + ' ' + (rawJob.location || ''));

  const job = await prisma.job.create({
    data: {
      sourceName: rawJob.sourceName,
      sourceType: rawJob.sourceType,
      title: rawJob.title,
      company: rawJob.company,
      location: rawJob.location,
      remote: rawJob.remote,
      seniority: rawJob.seniority,
      applyUrl: rawJob.applyUrl,
      descriptionText: rawJob.descriptionText,
      descriptionSnippet: rawJob.descriptionText.substring(0, 500),
      worldwideStatus: evaluation.status as WorldwideStatus,
      worldwideEvidence: evaluation.evidence,
      rejectionReason: evaluation.rejectionReason,
      matchedRejectPatterns: evaluation.matchedRejectPatterns,
    },
  });

  if (job.worldwideStatus === 'ACCEPTED') {
    await sendSlackNotification(job);
    await sendEmailNotification(job);
    return 'ACCEPTED';
  }

  return 'REJECTED';
}
