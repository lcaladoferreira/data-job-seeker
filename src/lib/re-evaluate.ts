import { prisma } from '../lib/prisma';

export async function clearDatabase() {
  // We use a transaction to ensure atomic clearing
  return await prisma.$transaction([
    prisma.alertLog.deleteMany(),
    prisma.job.deleteMany(),
    prisma.ingestionRun.deleteMany(),
  ]);
}
