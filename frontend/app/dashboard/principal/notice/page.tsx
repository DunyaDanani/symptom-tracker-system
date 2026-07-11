"use client";

import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";
import NoticeBoard from "@/components/NoticeBoard";

export default function PrincipalNoticePage() {
  return (
    <PrincipalDashboardLayout>
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">Notice</h1>
      <NoticeBoard canPost={true} />
    </PrincipalDashboardLayout>
  );
}
