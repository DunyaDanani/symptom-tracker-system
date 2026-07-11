"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import ReportsContent from "@/components/ReportsContent";
import BackButton from "@/components/BackButton";

export default function ChildReportsPage() {
  return (
    <FamilyDashboardLayout role="child">
      <BackButton />
      <ReportsContent />
    </FamilyDashboardLayout>
  );
}
