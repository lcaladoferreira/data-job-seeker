import { checkAuth } from '@/lib/auth';
import FilterTesterClient from './FilterTesterClient';

export default async function FilterTesterPage() {
  await checkAuth();

  return <FilterTesterClient />;
}
