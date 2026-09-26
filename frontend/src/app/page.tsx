'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'ENTREPRENEUR' || user.role === 'MANAGER') {
      router.replace('/app/dashboard');
    } else if (user.role === 'OFFICER' || user.role === 'NODAL' || user.role === 'INSPECTOR') {
      router.replace('/government/work-queue');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin/approval-types');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">IA</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-primary-600 animate-bounce" />
      </div>
    </div>
  );
}
