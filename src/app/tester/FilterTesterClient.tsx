'use client';
import { useState } from 'react';

export default function FilterTesterClient() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFilter = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: 'Failed to test filter' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl bg-white p-8 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 text-center">WORLDWIDE ONLY Filter Tester</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Test job descriptions against the strict worldwide filter logic.</p>

        <textarea
          className="w-full h-64 p-4 border rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm shadow-inner"
          placeholder="Paste job description here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={testFilter}
          disabled={loading || !text}
          className="w-full bg-blue-600 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 shadow-md"
        >
          {loading ? 'Testing...' : 'Test Filter'}
        </button>

        {result && !result.error && (
          <div className="mt-8 border-t pt-6 transition-all animate-in fade-in duration-500">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              Result:
              <span className={result.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-600'}>
                {result.status}
              </span>
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-700">Matched Evidence:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.evidence.length > 0 ? result.evidence.map((ev: string, i: number) => (
                    <span key={i} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold border border-green-200">{ev}</span>
                  )) : <span className="text-gray-400 text-xs italic">None</span>}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Rejection Reason:</p>
                <p className="text-sm text-red-600 italic mt-1 bg-red-50 p-2 rounded border border-red-100">
                  {result.rejectionReason || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">Matched Rejection Patterns:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.matchedRejectPatterns.length > 0 ? result.matchedRejectPatterns.map((p: string, i: number) => (
                    <span key={i} className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold border border-red-200">{p}</span>
                  )) : <span className="text-gray-400 text-xs italic">None</span>}
                </div>
              </div>
            </div>
          </div>
        )}
        {result?.error && (
          <div className="mt-8 bg-red-50 p-4 rounded-md border border-red-200 text-red-700 text-sm font-medium">
            {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
