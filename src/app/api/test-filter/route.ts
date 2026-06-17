import { checkAuth } from '@/lib/auth';
import { evaluateWorldwideEligibility } from '@/lib/worldwide-filter';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await checkAuth();
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await request.json();
  const result = evaluateWorldwideEligibility(text);
  return NextResponse.json(result);
}
