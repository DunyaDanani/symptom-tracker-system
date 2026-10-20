"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import NoticeBoard from "@/components/NoticeBoard";

export default function ParentNoticePage() {
  return (
    <FamilyDashboardLayout role="parent">
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">Notice</h1>
      <NoticeBoard canPost={false} />
    </FamilyDashboardLayout>
  );
}
