import { prisma } from '../src/lib/prisma';
import { evaluateWorldwideEligibility } from '../src/lib/worldwide-filter';
import { WorldwideStatus } from '@prisma/client';

async function reEvaluate() {
  console.log('Starting re-evaluation of all jobs...');
  const jobs = await prisma.job.findMany();
  console.log(`Found ${jobs.length} jobs to evaluate.`);

  let acceptedCount = 0;
  let rejectedCount = 0;

  for (const job of jobs) {
    const evaluation = evaluateWorldwideEligibility(
      job.title,
      job.location || '',
      job.descriptionText
    );

    await prisma.job.update({
      where: { id: job.id },
      data: {
        worldwideStatus: evaluation.status as WorldwideStatus,
        rejectionReason: evaluation.rejectionReason,
        matchedRejectPatterns: evaluation.matchedRejectPatterns,
        matchedKeywords: evaluation.matchedRoleKeywords,
        worldwideEvidence: evaluation.evidence,
      },
    });

    if (evaluation.status === 'ACCEPTED') {
      acceptedCount++;
    } else {
      rejectedCount++;
    }
  }

  console.log(`Re-evaluation complete.`);
  console.log(`Accepted: ${acceptedCount}`);
  console.log(`Rejected: ${rejectedCount}`);
}

reEvaluate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
