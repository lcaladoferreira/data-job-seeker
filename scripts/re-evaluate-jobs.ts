import { prisma } from '../src/lib/prisma';
import { evaluateWorldwideEligibility } from '../src/lib/worldwide-filter';
import { WorldwideStatus } from '@prisma/client';

async function reEvaluate() {
  console.log('--- STARTING MASS RE-EVALUATION ---');
  const jobs = await prisma.job.findMany();
  console.log(`Found ${jobs.length} jobs in database.`);

  let acceptedToRejected = 0;
  let rejectedToAccepted = 0;
  let maintained = 0;

  for (const job of jobs) {
    const evaluation = evaluateWorldwideEligibility(
      job.title,
      job.location || '',
      job.descriptionText
    );

    const oldStatus = job.worldwideStatus;
    const newStatus = evaluation.status as WorldwideStatus;

    if (oldStatus !== newStatus) {
      if (oldStatus === 'ACCEPTED' && newStatus === 'REJECTED') acceptedToRejected++;
      if (oldStatus === 'REJECTED' && newStatus === 'ACCEPTED') rejectedToAccepted++;

      await prisma.job.update({
        where: { id: job.id },
        data: {
          worldwideStatus: newStatus,
          rejectionReason: evaluation.rejectionReason,
          matchedRejectPatterns: evaluation.matchedRejectPatterns,
          matchedKeywords: evaluation.matchedRoleKeywords,
          worldwideEvidence: evaluation.evidence,
        },
      });
    } else {
      maintained++;
    }
  }

  console.log('--- RE-EVALUATION COMPLETE ---');
  console.log(`Maintained status: ${maintained}`);
  console.log(`Accepted -> Rejected (Cleaned): ${acceptedToRejected}`);
  console.log(`Rejected -> Accepted (Restored): ${rejectedToAccepted}`);
}

reEvaluate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
