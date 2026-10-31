'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-sm animate-pulse">
          <Mail className="w-5 h-5" />
        </div>
        <p className="text-xs font-medium text-gray-500">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

