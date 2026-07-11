"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import ReportsContent from "@/components/ReportsContent";
import BackButton from "@/components/BackButton";

export default function ParentReportsPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />
      <ReportsContent />
    </FamilyDashboardLayout>
  );
}
