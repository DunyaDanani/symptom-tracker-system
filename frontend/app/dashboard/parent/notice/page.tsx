"use client";

import ParentDashboardLayout from "@/components/ParentDashboardLayout";

export default function ParentNoticePage() {
  return (
    <ParentDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Notice</h1>
      <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
        No notices yet.
      </div>
    </ParentDashboardLayout>
  );
}
