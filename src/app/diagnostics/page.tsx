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

  const lastRunLog = runs[0]?.errorLog ? JSON.parse(runs[0].errorLog) : null;

  const rejectedJobs = await prisma.job.findMany({
    where: { worldwideStatus: 'REJECTED' },
    orderBy: { firstSeenAt: 'desc' },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-block text-blue-600 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-4xl font-black mb-8 tracking-tighter">Admin Diagnostics</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Runs */}
            <div className="lg:col-span-2 space-y-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        Recent Ingestion Runs
                    </h2>
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 font-bold">
                            <tr>
                            <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase">Started</th>
                            <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase text-center">A / R / D</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {runs.map((run) => (
                            <tr key={run.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{run.startedAt.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded text-[10px] font-black ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {run.status}
                                </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-center">
                                    <span className="text-green-600">{run.jobsAccepted}</span> /
                                    <span className="text-red-600 ml-1">{run.jobsRejected}</span> /
                                    <span className="text-gray-400 ml-1">{run.jobsFound - run.jobsAccepted - run.jobsRejected}</span>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                </section>

                {lastRunLog && (
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-green-600 rounded-full"></span>
                            Last Run Detail (Accounting)
                        </h2>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Total Fetched</p>
                                    <p className="text-xl font-black">{lastRunLog.overallStats.fetched}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <p className="text-[10px] text-green-600 uppercase font-bold">Accepted</p>
                                    <p className="text-xl font-black text-green-700">{lastRunLog.overallStats.accepted}</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <p className="text-[10px] text-red-600 uppercase font-bold">Rejected</p>
                                    <p className="text-xl font-black text-red-700">{lastRunLog.overallStats.rejected}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Duplicates</p>
                                    <p className="text-xl font-black">{lastRunLog.overallStats.duplicates}</p>
                                </div>
                            </div>

                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Debug Sample (First 20)</h3>
                            <div className="space-y-2">
                                {lastRunLog.debugLogs?.map((log: any, i: number) => (
                                    <div key={i} className="text-[11px] p-3 bg-gray-50 rounded border border-gray-100 font-mono overflow-x-auto whitespace-pre">
                                        {JSON.stringify(log, null, 2)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* Right Column: Rejected Samples */}
            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        Rejected Samples
                    </h2>
                    <div className="space-y-3">
                        {rejectedJobs.map(job => (
                        <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-sm">
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="font-bold text-gray-800 leading-tight">{job.title}</span>
                                <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded whitespace-nowrap">
                                    {job.rejectionReason}
                                </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mb-2 font-medium">
                                {job.company} | {job.sourceName}
                            </div>
                            {job.matchedRejectPatterns && (
                                <div className="flex flex-wrap gap-1">
                                    {(job.matchedRejectPatterns as string[]).map((p, i) => (
                                        <span key={i} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 pt-2 border-t border-gray-50">
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Duplicate Key</p>
                                <p className="text-[10px] font-mono text-gray-300 truncate">{job.contentHash}</p>
                            </div>
                        </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
}
