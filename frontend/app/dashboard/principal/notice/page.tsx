"use client";

import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import NoticeBoard from "@/components/NoticeBoard";

export default function PrincipalNoticePage() {
  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Notice</h1>
      <NoticeBoard canPost={true} />
    </PrincipalDashboardLayout>
  );
}
