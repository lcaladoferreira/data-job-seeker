import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import IngestButton from './IngestButton';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  await checkAuth();
  const { status = 'ACCEPTED', search = '' } = await searchParams;

  const jobs = await prisma.job.findMany({
    where: {
      worldwideStatus: status as any,
      OR: search ? [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ] : undefined,
    },
    orderBy: { firstSeenAt: 'desc' },
  }).catch(() => []); // Graceful handle for build-time collection

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Worldwide Data Jobs</h1>
            <p className="text-gray-500 mt-1 text-sm">Monitoring for explicitly worldwide remote opportunities.</p>
          </div>
          <div className="flex gap-4">
            <IngestButton />
          </div>
        </div>

        <div className="mb-8 flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <Link
              href="/?status=ACCEPTED"
              className={`flex-1 md:flex-none text-center rounded-md px-4 py-2 font-medium transition ${status === 'ACCEPTED' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Accepted
            </Link>
            <Link
              href="/?status=REJECTED"
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
              placeholder="Search by title or company..."
              className="flex-1 rounded-md border border-gray-300 p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none shadow-sm"
            />
            <input type="hidden" name="status" value={status} />
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white font-semibold hover:bg-blue-700 shadow-sm transition">
              Search
            </button>
          </form>
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
                      WORLDWIDE
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 uppercase tracking-tighter">
                      REJECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {job.worldwideEvidence.map((ev, i) => (
                  <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 border border-blue-200 font-medium">
                    {ev}
                  </span>
                ))}
              </div>

              {job.rejectionReason && (
                <div className="mt-3 bg-red-50 p-2 rounded text-[11px] text-red-700 border border-red-100">
                  <strong>Rejection Reason:</strong> {job.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
