import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import IngestButton from './IngestButton';
import DashboardFilters from './DashboardFilters';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
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
  const search = params.search || '';
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '30');
  const source = params.source || '';
  const company = params.company || '';
  const seniority = params.seniority || '';
  const alerted = params.alerted || '';
  const skip = (page - 1) * limit;

  const where: any = {
    worldwideStatus: 'ACCEPTED',
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

  // WE FETCH ALL ACCEPTED JOBS CURRENTLY IN DB, REGARDLESS OF LAST RUN
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
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Worldwide Data Jobs</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Explicitly worldwide remote **Data Engineering** opportunities.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/diagnostics" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition">
               Admin Diagnostics
            </Link>
            <IngestButton />
          </div>
        </div>

        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-black uppercase tracking-widest text-green-700">
                    {total} Valid Opportunities Found
                </span>
            </div>
            <form className="flex gap-2 w-full md:max-w-md">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by title, company, or tech..."
                className="flex-1 rounded-xl border border-gray-300 p-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner bg-gray-50"
              />
              <button type="submit" className="rounded-xl bg-blue-600 px-6 py-3 text-sm text-white font-black hover:bg-blue-700 shadow-md transition-all active:scale-95">
                Search
              </button>
            </form>
          </div>

          <DashboardFilters
            status="ACCEPTED"
            limit={limit}
            search={search}
            source={source}
            total={total}
          />
        </div>

        <div className="grid gap-6">
          {jobs.length === 0 && (
            <div className="text-center py-32 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold text-lg">No worldwide data engineering jobs found yet.</p>
              <p className="text-gray-400 text-sm mt-2">Try triggering a manual ingestion or adjusting filters.</p>
            </div>
          )}
          {jobs.map((job) => {
            const matchedKeywords = Array.isArray(job.matchedKeywords) ? job.matchedKeywords as string[] : [];
            const worldwideEvidence = Array.isArray(job.worldwideEvidence) ? job.worldwideEvidence as string[] : [];

            return (
              <div key={job.id} className="group rounded-2xl bg-white p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <Link href={`/jobs/${job.id}`} className="text-2xl font-black text-gray-900 hover:text-blue-600 transition-colors leading-tight">
                        {job.title}
                        </Link>
                        {job.seniority && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                                {job.seniority}
                            </span>
                        )}
                    </div>
                    <p className="text-lg font-bold text-gray-500 mb-4">{job.company}</p>

                    <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 text-gray-600">
                         📍 {job.location || 'Remote'}
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 text-gray-600">
                         🏢 {job.sourceName}
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 text-gray-600">
                         📅 {job.firstSeenAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full md:w-auto flex flex-col items-end gap-4">
                     <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full md:w-48 text-center rounded-xl bg-blue-600 px-6 py-4 text-sm font-black text-white uppercase tracking-tighter hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                     >
                        Apply Now
                     </a>
                     {job.salary && (
                         <span className="text-green-600 font-black text-sm">{job.salary}</span>
                     )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {matchedKeywords.map((kw: string, i: number) => (
                    <span key={`kw-${i}`} className="rounded-lg bg-indigo-50 px-3 py-1 text-[10px] text-indigo-700 border border-indigo-100 font-black uppercase tracking-tighter">
                      {kw}
                    </span>
                  ))}
                  {worldwideEvidence.map((ev: string, i: number) => (
                    <span key={`ev-${i}`} className="rounded-lg bg-green-50 px-3 py-1 text-[10px] text-green-700 border border-green-100 font-black uppercase tracking-tighter">
                      ✓ {ev}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <Link
              href={`/?limit=${limit}&search=${search}&source=${source}&page=${Math.max(1, page - 1)}`}
              className={`rounded-xl border border-gray-300 px-6 py-3 text-sm font-black transition ${page <= 1 ? 'pointer-events-none opacity-30 bg-gray-100' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}
            >
              PREV
            </Link>
            <div className="flex gap-2 font-black text-sm">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 const p = i + 1;
                 return (
                   <Link
                     key={p}
                     href={`/?limit=${limit}&search=${search}&source=${source}&page=${p}`}
                     className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${page === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-110' : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-700 shadow-sm'}`}
                   >
                     {p}
                   </Link>
                 );
               })}
            </div>
            <Link
              href={`/?limit=${limit}&search=${search}&source=${source}&page=${Math.min(totalPages, page + 1)}`}
              className={`rounded-xl border border-gray-300 px-6 py-3 text-sm font-black transition ${page >= totalPages ? 'pointer-events-none opacity-30 bg-gray-100' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}
            >
              NEXT
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
