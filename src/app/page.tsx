import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import IngestButton from './IngestButton';
import DashboardFilters from './DashboardFilters';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
    source?: string;
    company?: string;
    seniority?: string;
    alerted?: string;
  }>;
}) {
  await checkAuth();
  const params = await searchParams;
  const status = params.status || 'ACCEPTED';
  const search = params.search || '';
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '30');
  const source = params.source || '';
  const company = params.company || '';
  const seniority = params.seniority || '';
  const alerted = params.alerted || '';
  const skip = (page - 1) * limit;

  const where: any = {
    worldwideStatus: status as any,
  };

  if (source) where.sourceName = source;
  if (company) where.company = { contains: company, mode: 'insensitive' };
  if (alerted === 'slack') where.alertedSlackAt = { not: null };
  if (alerted === 'email') where.alertedEmailAt = { not: null };
  if (seniority) {
    where.OR = [
      { title: { contains: seniority, mode: 'insensitive' } },
      { descriptionText: { contains: seniority, mode: 'insensitive' } },
    ];
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { descriptionText: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      take: limit,
      skip: skip,
    }),
    prisma.job.count({ where }),
  ]).catch(() => [[], 0]) as [any[], number];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Worldwide Data Jobs</h1>
            <p className="text-gray-500 mt-1 text-sm">Monitoring ONLY for explicitly worldwide remote **Data Engineering** opportunities.</p>
          </div>
          <div className="flex gap-4">
            <IngestButton />
          </div>
        </div>

        <div className="mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href={`/?status=ACCEPTED&limit=${limit}&search=${search}&source=${source}`}
                className={`flex-1 md:flex-none text-center rounded-md px-4 py-2 font-medium transition ${status === 'ACCEPTED' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Accepted
              </Link>
              <Link
                href={`/?status=REJECTED&limit=${limit}&search=${search}&source=${source}`}
                className={`flex-1 md:flex-none text-center rounded-md px-4 py-2 font-medium transition ${status === 'REJECTED' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Rejected
              </Link>
            </div>
            <form className="flex gap-2 w-full md:max-w-md">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search everything..."
                className="flex-1 rounded-md border border-gray-300 p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none shadow-sm"
              />
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="limit" value={limit} />
              <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white font-semibold hover:bg-blue-700 shadow-sm transition">
                Search
              </button>
            </form>
          </div>

          <DashboardFilters
            status={status}
            limit={limit}
            search={search}
            source={source}
            total={total}
          />
        </div>

        <div className="grid gap-4">
          {jobs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
              No jobs found matching your criteria.
            </div>
          )}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <Link href={`/jobs/${job.id}`} className="text-xl font-bold text-blue-600 hover:underline decoration-2">
                    {job.title}
                  </Link>
                  <p className="font-semibold text-gray-800 mt-0.5">{job.company}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">📍 {job.location || 'Remote'}</span>
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">🏢 {job.sourceName}</span>
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">📅 {job.firstSeenAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="w-full md:w-auto text-right">
                  {job.worldwideStatus === 'ACCEPTED' ? (
                    <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 uppercase tracking-tighter">
                      ACCEPTED
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 uppercase tracking-tighter">
                      REJECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {job.worldwideStatus === 'ACCEPTED' && job.matchedKeywords.map((kw: string, i: number) => (
                  <span key={`kw-${i}`} className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700 border border-indigo-200 font-bold uppercase">
                    Role: {kw}
                  </span>
                ))}
                {job.worldwideEvidence.map((ev: string, i: number) => (
                  <span key={`ev-${i}`} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200 font-medium">
                    {ev}
                  </span>
                ))}
              </div>

              {job.rejectionReason && (
                <div className="mt-3 bg-red-50 p-2 rounded text-[11px] text-red-700 border border-red-100 font-bold">
                  REJECTION REASON: {job.rejectionReason}
                  {job.matchedRejectPatterns.length > 0 && (
                    <span className="ml-2 font-normal opacity-75">({job.matchedRejectPatterns.join(', ')})</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={`/?status=${status}&limit=${limit}&search=${search}&source=${source}&page=${Math.max(1, page - 1)}`}
              className={`rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition ${page <= 1 ? 'pointer-events-none opacity-50 bg-gray-100' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Previous
            </Link>
            <div className="flex gap-1">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 const p = i + 1;
                 return (
                   <Link
                     key={p}
                     href={`/?status=${status}&limit=${limit}&search=${search}&source=${source}&page=${p}`}
                     className={`rounded-md px-4 py-2 text-sm font-medium transition ${page === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                   >
                     {p}
                   </Link>
                 );
               })}
               {totalPages > 5 && <span className="px-2 py-2 text-gray-400 text-sm">...</span>}
            </div>
            <Link
              href={`/?status=${status}&limit=${limit}&search=${search}&source=${source}&page=${Math.min(totalPages, page + 1)}`}
              className={`rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition ${page >= totalPages ? 'pointer-events-none opacity-50 bg-gray-100' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
