import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorldwideStatus } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as WorldwideStatus | null;
  const search = searchParams.get('search');
  const source = searchParams.get('source');

  const where: any = {};
  if (status) where.worldwideStatus = status;
  if (source) where.sourceName = source;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
