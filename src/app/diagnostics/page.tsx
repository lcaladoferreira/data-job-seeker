import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DiagnosticsPage({
    searchParams,
  }: {
    searchParams: Promise<{
      page?: string;
      limit?: string;
    }>;
  }) {
  await checkAuth();
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = parseInt(params.limit || '10');
  const skip = (page - 1) * limit;

  const [runs, count] = await Promise.all([
    prisma.ingestionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: skip,
    }),
    prisma.ingestionRun.count(),
  ]);

  const rejectedJobs = await prisma.job.findMany({
    where: { worldwideStatus: 'REJECTED' },
    orderBy: { firstSeenAt: 'desc' },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-block text-blue-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-3xl font-bold mb-8">Admin Diagnostics</h1>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Recent Ingestion Runs</h2>
          <div className="overflow-hidden rounded-lg bg-white shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{run.startedAt.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{run.jobsAccepted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{run.jobsRejected}</td>
                    <td className="px-6 py-4 text-xs font-mono max-w-xs overflow-hidden text-ellipsis">
                       {run.errorLog ? 'Has breakdown' : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">Recently Rejected Jobs (Sample 50)</h2>
          <div className="grid gap-2">
            {rejectedJobs.map(job => (
              <div key={job.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">{job.title}</span>
                  <span className="text-red-600 font-medium italic">{job.rejectionReason}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {job.company} | {job.sourceName} | {job.location || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
