'use client';
import { useState } from 'react';

export default function IngestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleIngest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ingest/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        window.location.reload();
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
      <button onClick={handleIngest} disabled={loading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md">
        {loading ? 'Running Ingestion...' : 'Trigger Manual Ingestion'}
      </button>
      {result && (
        <div className={`absolute right-0 top-12 z-10 w-64 rounded-md border p-4 shadow-lg bg-white ${result.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {result.error ? <p className="text-sm text-red-700">{result.error}</p> : (
            <div className="text-sm text-green-700">
              <p className="font-bold">Ingestion Complete!</p>
              <p>Found: {result.totalFound}</p>
              <p>Accepted: {result.totalAccepted}</p>
              <p>Rejected: {result.totalRejected}</p>
            </div>
          )}
          <button onClick={() => setResult(null)} className="mt-2 text-xs text-gray-500 underline">Close</button>
        </div>
      )}
    </div>
  );
}
