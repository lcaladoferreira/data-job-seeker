import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WorldwideStatus } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as WorldwideStatus | null;
  const search = searchParams.get('search');
  const source = searchParams.get('source');
  const company = searchParams.get('company');
  const title = searchParams.get('title');
  const seniority = searchParams.get('seniority');
  const alerted = searchParams.get('alerted');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.worldwideStatus = status;
  if (source) where.sourceName = source;
  if (company) where.company = { contains: company, mode: 'insensitive' };
  if (title) where.title = { contains: title, mode: 'insensitive' };
  if (seniority) {
    where.OR = [
      { title: { contains: seniority, mode: 'insensitive' } },
      { descriptionText: { contains: seniority, mode: 'insensitive' } },
    ];
  }
  if (alerted === 'slack') where.alertedSlackAt = { not: null };
  if (alerted === 'email') where.alertedEmailAt = { not: null };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { descriptionText: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { firstSeenAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
