"use client";

import DashboardLayout from "@/components/DashboardLayout";
import NoticeBoard from "@/components/NoticeBoard";

export default function AdminNoticePage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Notice</h1>
      <NoticeBoard canPost={true} />
    </DashboardLayout>
  );
}
