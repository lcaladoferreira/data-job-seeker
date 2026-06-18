import { prisma } from './prisma';
import { JobAdapter, RawJob } from './adapters/types';
import { RemoteOkAdapter } from './adapters/remoteok';
import { RemotiveAdapter } from './adapters/remotive';
import { WWRAdapter } from './adapters/wwr';
import { JobicyAdapter } from './adapters/jobicy';
import { ArbeitnowAdapter } from './adapters/arbeitnow';
import { HackerNewsAdapter } from './adapters/hackernews';
import { RSSAdapter } from './adapters/rss';
import fs from 'fs';
import path from 'path';
import { evaluateWorldwideEligibility } from './worldwide-filter';
import { WorldwideStatus, Job } from '@prisma/client';
import { sendSlackNotification } from './notifications/slack';
import { sendEmailDigest } from './notifications/email';
import axios from 'axios';

async function resolveFinalUrl(url: string): Promise<{ finalUrl: string; httpStatus: number }> {
  try {
    const response = await axios.head(url, {
      maxRedirects: 10,
      timeout: 5000,
      headers: { 'User-Agent': 'WorldwideDataJobsMonitor/1.0' }
    });
    return {
      finalUrl: response.request.res.responseUrl || url,
      httpStatus: response.status
    };
  } catch (error: any) {
    return {
      finalUrl: url,
      httpStatus: error.response?.status || 0
    };
  }
}

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

  // Load RSS adapters from config
  try {
    const configPath = path.join(process.cwd(), 'rss-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (Array.isArray(config)) {
        for (const feed of config) {
          adapters.push(new RSSAdapter(feed.name, feed.url));
        }
      }
    }
  } catch (error) {
    console.error('Failed to load RSS config:', error);
  }

  let totalFound = 0, totalAccepted = 0, totalRejected = 0, totalDuplicates = 0;
  const rejectionReasons: Record<string, number> = {};
  const sourceBreakdown: Record<string, { found: number, accepted: number, rejected: number, duplicates: number }> = {};
  const acceptedJobsForDigest: Job[] = [];
  const errors: string[] = [];

  for (const adapter of adapters) {
    sourceBreakdown[adapter.name] = { found: 0, accepted: 0, rejected: 0, duplicates: 0 };
    try {
      const rawJobs = await adapter.fetchJobs();
      sourceBreakdown[adapter.name].found = rawJobs.length;
      totalFound += rawJobs.length;

      for (const rawJob of rawJobs) {
        const result = await processJob(rawJob);

        if (result.status === 'ACCEPTED' && result.job) {
          totalAccepted++;
          sourceBreakdown[adapter.name].accepted++;
          acceptedJobsForDigest.push(result.job);
        } else if (result.status === 'REJECTED') {
          totalRejected++;
          sourceBreakdown[adapter.name].rejected++;
          if (result.evaluation?.rejectionReason) {
            const reason = result.evaluation.rejectionReason;
            rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          }
        } else if (result.status === 'DUPLICATE') {
          totalDuplicates++;
          sourceBreakdown[adapter.name].duplicates++;
        }
      }
    } catch (error) {
      errors.push(`Error in adapter ${adapter.name}: ${error}`);
    }
  }

  // MINIMUM THRESHOLD CHECK
  const isSufficient = totalAccepted >= 30;

  if (isSufficient && acceptedJobsForDigest.length > 0) {
    try {
      await sendEmailDigest(acceptedJobsForDigest);
    } catch (error) {
      console.error('Failed to send email digest during ingestion:', error);
    }
  }

  const finalStatus = !isSufficient ? 'INSUFFICIENT_DATA' : (errors.length === 0 ? 'SUCCESS' : (errors.length < adapters.length ? 'PARTIAL' : 'FAILED'));

  await prisma.ingestionRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status: finalStatus,
      jobsFound: totalFound,
      jobsAccepted: totalAccepted,
      jobsRejected: totalRejected,
      errorLog: JSON.stringify({
        errors,
        rejectionReasons,
        sourceBreakdown,
        totalDuplicates,
        accounting: {
          sum: totalAccepted + totalRejected + totalDuplicates,
          total: totalFound,
          match: (totalAccepted + totalRejected + totalDuplicates) === totalFound
        }
      }, null, 2),
    },
  });

  return {
    totalFound,
    totalAccepted,
    totalRejected,
    totalDuplicates,
    rejectionReasons,
    sourceBreakdown,
    status: finalStatus,
    message: isSufficient ? undefined : "Not enough qualified worldwide data engineer jobs found."
  };
}

async function processJob(rawJob: RawJob) {
  // Check for duplication before expensive operations if possible
  const existingJob = await prisma.job.findFirst({
    where: {
      OR: [
        { title: rawJob.title, company: rawJob.company }
      ]
    },
  });

  if (existingJob) {
    await prisma.job.update({
      where: { id: existingJob.id },
      data: { lastSeenAt: new Date() },
    });
    return { status: 'DUPLICATE' as const };
  }

  const { finalUrl, httpStatus } = await resolveFinalUrl(rawJob.applyUrl);

  // Re-check with final URL
  const existingByUrl = await prisma.job.findFirst({
    where: { finalUrl: finalUrl }
  });

  if (existingByUrl) {
    return { status: 'DUPLICATE' as const };
  }

  const evaluation = evaluateWorldwideEligibility(
    rawJob.title,
    rawJob.location || '',
    rawJob.descriptionText
  );

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
      finalUrl: finalUrl,
      httpStatus: httpStatus,
      descriptionText: rawJob.descriptionText,
      descriptionSnippet: rawJob.descriptionText.substring(0, 500),
      worldwideStatus: evaluation.status as WorldwideStatus,
      worldwideEvidence: evaluation.evidence,
      rejectionReason: evaluation.rejectionReason,
      matchedRejectPatterns: evaluation.matchedRejectPatterns,
      matchedKeywords: evaluation.matchedRoleKeywords,
    },
  });

  if (job.worldwideStatus === 'ACCEPTED') {
    await sendSlackNotification(job);
    return { status: 'ACCEPTED' as const, job, evaluation };
  }

  return { status: 'REJECTED' as const, evaluation };
}
