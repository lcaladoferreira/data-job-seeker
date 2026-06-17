import { NextResponse } from 'next/server';
import { runIngestion } from '@/lib/ingest';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const appPassword = process.env.APP_PASSWORD;
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');

  const isAuthenticated =
    (appPassword && authHeader === `Bearer ${appPassword}`) ||
    (appPassword && authCookie?.value === appPassword);

  if (!isAuthenticated && appPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runIngestion();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
