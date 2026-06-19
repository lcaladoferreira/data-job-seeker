'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IngestButton() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const router = useRouter();

  const handleIngest = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch('/api/ingest/run', { method: 'POST' });
      const data = await res.json();
      setSummary(data);
      router.refresh();
    } catch (error) {
      console.error('Ingestion failed:', error);
      alert('Ingestion failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleReEvaluate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/re-evaluate', { method: 'POST' });
      const data = await res.json();
      alert(`Re-evaluation complete: ${data.updated} jobs updated.`);
      router.refresh();
    } catch (error) {
      console.error('Re-evaluation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={handleReEvaluate}
          disabled={loading}
          className="rounded-md bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-50 shadow-sm transition"
        >
          Clean Dashboard
        </button>
        <button
          onClick={handleIngest}
          disabled={loading}
          className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Ingesting...' : 'Trigger Manual Ingestion'}
        </button>
      </div>

      {summary && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg bg-white p-4 shadow-xl border border-gray-200 text-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-900">Ingestion Complete</h3>
            <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-1 text-gray-700">
            <div className="flex justify-between border-b pb-1"><span>Status:</span> <span className="font-bold">{summary.status}</span></div>
            <div className="flex justify-between"><span>Fetched:</span> <span>{summary.totalFound}</span></div>
            <div className="flex justify-between text-green-700 font-medium"><span>Accepted:</span> <span>{summary.totalAccepted}</span></div>
            <div className="flex justify-between text-red-700"><span>Rejected:</span> <span>{summary.totalRejected}</span></div>
            <div className="flex justify-between text-gray-500"><span>Duplicates:</span> <span>{summary.totalDuplicates}</span></div>
          </div>

          <div className="mt-3 pt-2 border-t text-[10px]">
             <p className="font-bold text-gray-500 uppercase mb-1">Source Breakdown</p>
             {Object.entries(summary.sourceBreakdown || {}).map(([name, stats]: any) => (
                <div key={name} className="flex justify-between py-0.5">
                   <span>{name}:</span>
                   <span className="font-mono">{stats.accepted}A / {stats.rejected}R</span>
                </div>
             ))}
          </div>

          {summary.message && (
            <p className="mt-3 text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded">{summary.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
