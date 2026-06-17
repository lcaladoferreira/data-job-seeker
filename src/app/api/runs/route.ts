import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const runs = await prisma.ingestionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    return NextResponse.json(runs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
