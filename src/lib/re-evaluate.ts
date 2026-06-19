import { prisma } from '../lib/prisma';
import { evaluateWorldwideEligibility } from '../lib/worldwide-filter';
import { WorldwideStatus } from '@prisma/client';

export async function reEvaluateAllJobs() {
  const jobs = await prisma.job.findMany();
  let updated = 0;

  for (const job of jobs) {
    const evaluation = evaluateWorldwideEligibility(
      job.title,
      job.location || '',
      job.descriptionText
    );

    if (evaluation.status !== job.worldwideStatus) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          worldwideStatus: evaluation.status as WorldwideStatus,
          worldwideEvidence: evaluation.evidence as any,
          rejectionReason: evaluation.rejectionReason,
          matchedRejectPatterns: evaluation.matchedRejectPatterns as any,
          matchedKeywords: evaluation.matchedRoleKeywords as any,
        }
      });
      updated++;
    }
  }

  return updated;
}
