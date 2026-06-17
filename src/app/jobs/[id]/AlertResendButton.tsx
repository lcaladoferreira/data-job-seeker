'use client';
import { useState } from 'react';

export default function AlertResendButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/resend-alert`, { method: 'POST' });
      if (res.ok) setStatus('Alerts resent successfully!');
      else setStatus('Failed to resend alerts.');
    } catch (e) {
      setStatus('Error resending alerts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleResend} disabled={loading} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        {loading ? 'Resending...' : 'Resend Alerts'}
      </button>
      {status && <p className={`mt-1 text-xs font-medium ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{status}</p>}
    </div>
  );
}
