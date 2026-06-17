import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password === process.env.APP_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
