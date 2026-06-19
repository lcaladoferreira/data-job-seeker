import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { reEvaluateAllJobs } from '@/lib/re-evaluate';

export async function POST() {
  try {
    await checkAuth();
    const updated = await reEvaluateAllJobs();
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized or failed' }, { status: 401 });
  }
}
