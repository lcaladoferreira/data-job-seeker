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
import crypto from 'crypto';

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

interface IngestionStats {
    fetched: number;
    parsed: number;
    accepted: number;
    rejected: number;
    duplicates: number;
    malformed: number;
    errors: number;
}

interface SourceStats extends IngestionStats {
    name: string;
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

  const overallStats: IngestionStats = { fetched: 0, parsed: 0, accepted: 0, rejected: 0, duplicates: 0, malformed: 0, errors: 0 };
  const sourceBreakdown: Record<string, SourceStats> = {};
  const acceptedJobsForDigest: Job[] = [];
  const runErrors: string[] = [];
  const debugLogs: any[] = [];

  for (const adapter of adapters) {
    const sourceStats: SourceStats = { name: adapter.name, fetched: 0, parsed: 0, accepted: 0, rejected: 0, duplicates: 0, malformed: 0, errors: 0 };
    sourceBreakdown[adapter.name] = sourceStats;

    try {
      const rawJobs = await adapter.fetchJobs();
      sourceStats.fetched = rawJobs.length;
      overallStats.fetched += rawJobs.length;

      for (const rawJob of rawJobs) {
        // 1. NORMALIZE & VALIDATE
        if (!rawJob.title || !rawJob.company || !rawJob.applyUrl) {
            sourceStats.malformed++;
            overallStats.malformed++;
            continue;
        }
        sourceStats.parsed++;
        overallStats.parsed++;

        // 2. CLASSIFY
        const evaluation = evaluateWorldwideEligibility(
            rawJob.title,
            rawJob.location || '',
            rawJob.descriptionText
        );

        // 3. DEDUPLICATE (Robust Key)
        // Normalize URL: remove query params, trailing slashes
        const normalizedUrl = rawJob.applyUrl.split('?')[0].replace(/\/$/, '').toLowerCase();
        const duplicateKey = crypto.createHash('md5').update(`${adapter.name}|${normalizedUrl}|${rawJob.title.toLowerCase().trim()}|${rawJob.company.toLowerCase().trim()}`).digest('hex');

        const existingJob = await prisma.job.findFirst({
            where: {
                OR: [
                    { applyUrl: normalizedUrl },
                    { contentHash: duplicateKey }
                ]
            }
        });

        if (existingJob) {
            sourceStats.duplicates++;
            overallStats.duplicates++;

            // Re-evaluate existing job if it was rejected before but now accepted due to filter changes
            if (evaluation.status === 'ACCEPTED' && existingJob.worldwideStatus === 'REJECTED') {
                const updatedJob = await prisma.job.update({
                    where: { id: existingJob.id },
                    data: {
                        worldwideStatus: 'ACCEPTED',
                        worldwideEvidence: evaluation.evidence as any,
                        matchedKeywords: evaluation.matchedRoleKeywords as any,
                        lastSeenAt: new Date(),
                    }
                });
                await sendSlackNotification(updatedJob);
                acceptedJobsForDigest.push(updatedJob);
            } else {
                await prisma.job.update({
                    where: { id: existingJob.id },
                    data: { lastSeenAt: new Date() }
                });
            }
            continue;
        }

        // 4. PERSIST
        const { finalUrl, httpStatus } = await resolveFinalUrl(rawJob.applyUrl);

        const job = await prisma.job.create({
            data: {
                sourceName: adapter.name,
                sourceType: rawJob.sourceType,
                title: rawJob.title,
                company: rawJob.company,
                location: rawJob.location,
                remote: rawJob.remote,
                seniority: rawJob.seniority,
                applyUrl: normalizedUrl,
                finalUrl: finalUrl,
                httpStatus: httpStatus,
                descriptionText: rawJob.descriptionText,
                descriptionSnippet: rawJob.descriptionText.substring(0, 500),
                worldwideStatus: evaluation.status as WorldwideStatus,
                worldwideEvidence: evaluation.evidence as any,
                rejectionReason: evaluation.rejectionReason,
                matchedRejectPatterns: evaluation.matchedRejectPatterns as any,
                matchedKeywords: evaluation.matchedRoleKeywords as any,
                contentHash: duplicateKey,
            }
        });

        if (evaluation.status === 'ACCEPTED') {
            sourceStats.accepted++;
            overallStats.accepted++;
            acceptedJobsForDigest.push(job);
            await sendSlackNotification(job);
        } else {
            sourceStats.rejected++;
            overallStats.rejected++;
        }

        if (debugLogs.length < 20) {
            debugLogs.push({
                source: adapter.name,
                title: rawJob.title,
                company: rawJob.company,
                location: rawJob.location,
                url: normalizedUrl,
                duplicateKey,
                status: evaluation.status,
                reason: evaluation.rejectionReason
            });
        }
      }
    } catch (error) {
      sourceStats.errors++;
      overallStats.errors++;
      runErrors.push(`Error in adapter ${adapter.name}: ${error}`);
    }
  }

  const isSufficient = overallStats.accepted >= 30;
  if (isSufficient && acceptedJobsForDigest.length > 0) {
      await sendEmailDigest(acceptedJobsForDigest);
  }

  const finalStatus = !isSufficient ? 'INSUFFICIENT_DATA' : (runErrors.length === 0 ? 'SUCCESS' : 'PARTIAL');

  await prisma.ingestionRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status: finalStatus,
      jobsFound: overallStats.fetched,
      jobsAccepted: overallStats.accepted,
      jobsRejected: overallStats.rejected,
      errorLog: JSON.stringify({
        overallStats,
        sourceBreakdown,
        runErrors,
        debugLogs,
        accounting: {
            fetched: overallStats.fetched,
            accounted: overallStats.accepted + overallStats.rejected + overallStats.duplicates + overallStats.malformed,
            match: overallStats.fetched === (overallStats.accepted + overallStats.rejected + overallStats.duplicates + overallStats.malformed)
        }
      }, null, 2),
    },
  });

  return {
    ...overallStats,
    sourceBreakdown,
    status: finalStatus,
    message: isSufficient ? undefined : `Found only ${overallStats.accepted} accepted jobs. 30 required.`
  };
}
