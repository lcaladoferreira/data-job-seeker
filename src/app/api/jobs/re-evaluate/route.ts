import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { clearDatabase } from '@/lib/re-evaluate';

export async function POST() {
  try {
    await checkAuth();
    await clearDatabase();
    return NextResponse.json({ success: true, message: 'Database cleared successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized or failed' }, { status: 401 });
  }
}
