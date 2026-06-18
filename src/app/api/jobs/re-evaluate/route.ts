import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateWorldwideEligibility } from '@/lib/worldwide-filter';
import { WorldwideStatus } from '@prisma/client';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const appPassword = process.env.APP_PASSWORD;
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');

  if (appPassword && authCookie?.value !== appPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = await prisma.job.findMany();
  let cleanedCount = 0;

  for (const job of jobs) {
    const evaluation = evaluateWorldwideEligibility(
      job.title,
      job.location || '',
      job.descriptionText
    );

    if (job.worldwideStatus === 'ACCEPTED' && evaluation.status === 'REJECTED') {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          worldwideStatus: 'REJECTED',
          rejectionReason: evaluation.rejectionReason,
          matchedRejectPatterns: evaluation.matchedRejectPatterns,
        },
      });
      cleanedCount++;
    }
  }

  return NextResponse.json({ success: true, cleanedCount });
}
