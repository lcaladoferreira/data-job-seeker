import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSlackNotification } from '@/lib/notifications/slack';
import { sendEmailNotification } from '@/lib/notifications/email';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    await sendSlackNotification(job);
    await sendEmailNotification(job);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
