'use client';
import { useState } from 'react';

export default function IngestButton() {
  const [loading, setLoading] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleReevaluate = async () => {
    setReevaluating(true);
    try {
      const res = await fetch('/api/jobs/re-evaluate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Cleaned up ${data.cleanedCount} irrelevant jobs from the dashboard.`);
        window.location.reload();
      }
    } catch (e) {
      alert('Failed to re-evaluate jobs');
    } finally {
      setReevaluating(false);
    }
  };

  const handleIngest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ingest/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setResult({ error: data.error || 'Failed to start ingestion' });
      }
    } catch (e) {
      setResult({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={handleReevaluate}
          disabled={reevaluating}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 shadow-md"
          title="Re-run filter on all existing jobs to remove irrelevant ones"
        >
          {reevaluating ? 'Cleaning...' : 'Clean Dashboard'}
        </button>
        <button onClick={handleIngest} disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md">
          {loading ? 'Running Ingestion...' : 'Trigger Manual Ingestion'}
        </button>
      </div>
      {result && (
        <div className={`absolute right-0 top-12 z-50 w-80 rounded-md border p-4 shadow-xl bg-white ${result.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-white'}`}>
          {result.error ? <p className="text-sm text-red-700">{result.error}</p> : (
            <div className="text-xs text-gray-700">
              <p className="font-bold text-green-700 text-sm mb-2 underline underline-offset-4">Ingestion Summary</p>
              {result.status === 'INSUFFICIENT_DATA' && (
                <div className="mb-3 bg-red-100 border border-red-200 p-2 rounded text-red-700 font-bold">
                  {result.message}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-50 p-2 rounded">
                <div className="text-center"><p className="font-bold text-lg">{result.totalFound}</p><p className="text-[9px] uppercase">Found</p></div>
                <div className="text-center text-green-600"><p className="font-bold text-lg">{result.totalAccepted}</p><p className="text-[9px] uppercase">Accepted</p></div>
                <div className="text-center text-red-600"><p className="font-bold text-lg">{result.totalRejected}</p><p className="text-[9px] uppercase">Rejected</p></div>
              </div>

              {result.rejectionReasons && Object.keys(result.rejectionReasons).length > 0 && (
                <div className="mb-3">
                  <p className="font-bold mb-1 text-[10px] uppercase text-gray-500">Rejection Reasons:</p>
                  {Object.entries(result.rejectionReasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between border-b border-gray-100 py-0.5">
                      <span>{reason}</span>
                      <span className="font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.sourceBreakdown && Object.keys(result.sourceBreakdown).length > 0 && (
                <div>
                  <p className="font-bold mb-1 text-[10px] uppercase text-gray-500">Source Breakdown:</p>
                  {Object.entries(result.sourceBreakdown).map(([source, stats]: [string, any]) => (
                    <div key={source} className="flex justify-between border-b border-gray-100 py-0.5">
                      <span>{source}</span>
                      <span className="font-bold text-green-600">{stats.accepted}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  window.location.reload();
                }}
                className="mt-4 w-full bg-gray-900 text-white py-1.5 rounded font-bold hover:bg-black transition"
              >
                Close & Refresh
              </button>
            </div>
          )}
          {!result.error && <button onClick={() => setResult(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">×</button>}
        </div>
      )}
    </div>
  );
}
