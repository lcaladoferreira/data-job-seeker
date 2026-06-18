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
import { WorldwideStatus } from '@prisma/client';
import { sendSlackNotification } from './notifications/slack';
import { sendEmailNotification, sendEmailDigest } from './notifications/email';
import { Job } from '@prisma/client';
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

  let totalFound = 0, totalAccepted = 0, totalRejected = 0;
  const rejectionReasons: Record<string, number> = {};
  const sourceBreakdown: Record<string, { found: number, accepted: number, rejected: number }> = {};
  const acceptedJobsForDigest: Job[] = [];
  const errors: string[] = [];

  for (const adapter of adapters) {
    sourceBreakdown[adapter.name] = { found: 0, accepted: 0, rejected: 0 };
    try {
      const rawJobs = await adapter.fetchJobs();
      totalFound += rawJobs.length;
      sourceBreakdown[adapter.name].found = rawJobs.length;

      for (const rawJob of rawJobs) {
        const { result, job, evaluation } = await processJob(rawJob);
        if (result === 'ACCEPTED' && job) {
          totalAccepted++;
          sourceBreakdown[adapter.name].accepted++;
          acceptedJobsForDigest.push(job);
        } else if (result === 'REJECTED') {
          totalRejected++;
          sourceBreakdown[adapter.name].rejected++;
          if (evaluation?.rejectionReason) {
            rejectionReasons[evaluation.rejectionReason] = (rejectionReasons[evaluation.rejectionReason] || 0) + 1;
          }
        }
      }
    } catch (error) {
      errors.push(`Error in adapter ${adapter.name}: ${error}`);
    }
  }

  // Send Email Digest for newly accepted jobs
  if (acceptedJobsForDigest.length > 0) {
    try {
      await sendEmailDigest(acceptedJobsForDigest);
    } catch (error) {
      console.error('Failed to send email digest during ingestion:', error);
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
      errorLog: JSON.stringify({ errors, rejectionReasons, sourceBreakdown }, null, 2),
    },
  });

  return { totalFound, totalAccepted, totalRejected, rejectionReasons, sourceBreakdown };
}

async function processJob(rawJob: RawJob) {
  const { finalUrl, httpStatus } = await resolveFinalUrl(rawJob.applyUrl);

  const existingJob = await prisma.job.findFirst({
    where: {
      OR: [
        { applyUrl: rawJob.applyUrl },
        { finalUrl: finalUrl },
        { title: rawJob.title, company: rawJob.company }
      ]
    },
  });

  if (existingJob) {
    await prisma.job.update({
      where: { id: existingJob.id },
      data: { lastSeenAt: new Date() },
    });
    return { result: 'EXISTING' };
  }

  // Use the new evaluation logic with separate title, location, description
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
    // Email digest is handled in runIngestion
    return { result: 'ACCEPTED', job, evaluation };
  }

  return { result: 'REJECTED', evaluation };
}
