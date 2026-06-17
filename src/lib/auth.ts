import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function checkAuth() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth');
  if (auth?.value !== process.env.APP_PASSWORD) {
    redirect('/login');
  }
}
