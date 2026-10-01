'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ApprovalTrackerRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id || 'proj-abc-foods-001';

  useEffect(() => {
    router.replace(`/app/projects/${id}?tab=tracker`);
  }, [router, id]);

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-white rounded-2xl border border-gray-200 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Opening Statutory Clearance Tracker...</p>
      </div>
    </div>
  );
}
