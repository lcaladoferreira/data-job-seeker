'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface DashboardFiltersProps {
  status: string;
  limit: number;
  search: string;
  source: string;
  total: number;
}

export default function DashboardFilters({ status, limit, search, source, total }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1'); // Reset to page 1 on filter change
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between border-t border-gray-50 pt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filters:</span>
        <select
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none text-gray-900"
          onChange={(e) => updateFilters({ source: e.target.value })}
          value={source}
        >
          <option value="">All Sources</option>
          <option value="RemoteOK">RemoteOK</option>
          <option value="Remotive">Remotive</option>
          <option value="WeWorkRemotely">WWR</option>
          <option value="Jobicy">Jobicy</option>
          <option value="Arbeitnow">Arbeitnow</option>
          <option value="HackerNews">HackerNews</option>
          <option value="RSS">RSS Feeds</option>
        </select>

        <select
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none text-gray-900"
          onChange={(e) => updateFilters({ seniority: e.target.value })}
          value={searchParams.get('seniority') || ''}
        >
          <option value="">All Seniorities</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="staff">Staff</option>
          <option value="junior">Junior</option>
        </select>

        <select
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none text-gray-900"
          onChange={(e) => updateFilters({ alerted: e.target.value })}
          value={searchParams.get('alerted') || ''}
        >
          <option value="">All Alerts</option>
          <option value="slack">Slack Alerted</option>
          <option value="email">Email Alerted</option>
        </select>

        <select
          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none text-gray-900"
          onChange={(e) => updateFilters({ limit: e.target.value })}
          value={limit}
        >
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="30">30 per page</option>
          <option value="50">50 per page</option>
        </select>
      </div>
      <div className="text-sm font-medium text-gray-600">
        Found <span className="text-blue-600 font-bold">{total}</span> jobs
      </div>
    </div>
  );
}
