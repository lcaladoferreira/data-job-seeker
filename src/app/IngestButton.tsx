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

  const handleClear = async () => {
    if (!confirm('Are you sure you want to CLEAR ALL DATA? This will delete all jobs, runs, and logs.')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/jobs/re-evaluate', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Database cleared.');
      setSummary(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Clear failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          disabled={loading}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 shadow-sm transition"
        >
          Reset Database
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
        <div className="absolute right-0 top-12 z-50 w-96 rounded-lg bg-white p-6 shadow-2xl border border-gray-200 text-sm overflow-y-auto max-h-[80vh]">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-gray-900 text-base">Ingestion Summary</h3>
            <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
          </div>

          <div className="space-y-3 text-gray-700">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Status</p>
                    <p className={`font-bold ${summary.status === 'SUCCESS' ? 'text-green-600' : 'text-orange-600'}`}>{summary.status}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Fetched</p>
                    <p className="font-bold">{summary.fetched}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 p-2 rounded border border-green-100">
                    <p className="text-[10px] text-green-700 uppercase font-bold">Accepted</p>
                    <p className="text-lg font-bold text-green-800">{summary.accepted}</p>
                </div>
                <div className="bg-red-50 p-2 rounded border border-red-100">
                    <p className="text-[10px] text-red-700 uppercase font-bold">Rejected</p>
                    <p className="text-lg font-bold text-red-800">{summary.rejected}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <p className="text-[10px] text-gray-700 uppercase font-bold">Duplicate</p>
                    <p className="text-lg font-bold text-gray-800">{summary.duplicates}</p>
                </div>
            </div>

            <div className="flex justify-between px-2 text-xs text-gray-500">
                <span>Malformed: {summary.malformed}</span>
                <span>Errors: {summary.errors}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
             <p className="font-bold text-gray-500 uppercase text-[10px] mb-2 tracking-widest">Source Breakdown</p>
             <div className="space-y-1">
                {Object.entries(summary.sourceBreakdown || {}).map(([name, stats]: any) => (
                    <div key={name} className="flex flex-col border-b border-gray-50 pb-1 mb-1">
                       <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{name}</span>
                          <span className="text-[10px] text-gray-400">Fetched: {stats.fetched}</span>
                       </div>
                       <div className="flex gap-2 text-[10px] font-mono">
                          <span className="text-green-600">{stats.accepted} Acc</span>
                          <span className="text-red-500">{stats.rejected} Rej</span>
                          <span className="text-gray-400">{stats.duplicates} Dup</span>
                          {stats.malformed > 0 && <span className="text-orange-500">{stats.malformed} Mal</span>}
                       </div>
                    </div>
                ))}
             </div>
          </div>

          {summary.message && (
            <p className="mt-4 text-xs text-orange-700 font-medium bg-orange-50 p-3 rounded-md border border-orange-100">{summary.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
