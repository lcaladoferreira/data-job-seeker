import { checkAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AlertResendButton from './AlertResendButton';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await checkAuth();
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { alertLogs: { orderBy: { sentAt: 'desc' } } },
  });
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-6 inline-block text-blue-600 hover:underline">← Back to Dashboard</Link>
        <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-xl font-medium text-gray-700 mt-1">{job.company}</p>
              <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>📍 {job.location || 'Remote'}</span>
                  <span>🔗 {job.sourceName}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="rounded-md bg-blue-600 px-6 py-2 text-center text-white font-semibold hover:bg-blue-700">Apply Now</a>
              <AlertResendButton jobId={job.id} />
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Evaluation Result</h2>
            <div className={`p-4 rounded-md ${job.worldwideStatus === 'ACCEPTED' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
              <p className={`font-bold text-lg ${job.worldwideStatus === 'ACCEPTED' ? 'text-green-800' : 'text-red-800'}`}>Status: {job.worldwideStatus}</p>

              {job.worldwideStatus === 'ACCEPTED' && job.matchedKeywords.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-bold text-gray-700">Role Match Evidence:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {job.matchedKeywords.map((kw, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs font-bold uppercase">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {job.worldwideEvidence.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-bold text-gray-700">Worldwide Remote Evidence:</p>
                  <ul className="list-disc list-inside mt-1 text-gray-600">{job.worldwideEvidence.map((ev, i) => <li key={i}>{ev}</li>)}</ul>
                </div>
              )}

              {job.rejectionReason && (
                <div className="mt-3">
                   <p className="text-sm font-bold text-red-800 italic">Rejection Reason: {job.rejectionReason}</p>
                   {job.matchedRejectPatterns.length > 0 && (
                     <div className="mt-1 flex flex-wrap gap-2">
                        {job.matchedRejectPatterns.map((p, i) => (
                          <span key={i} className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-medium">{p}</span>
                        ))}
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Description Snippet</h2>
            <div className="rounded-md bg-gray-50 p-4 text-gray-700 whitespace-pre-wrap text-sm border border-gray-200">{job.descriptionSnippet}...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
