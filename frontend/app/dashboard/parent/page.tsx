"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import FamilyDashboardHome from "@/components/FamilyDashboardHome";

export default function ParentDashboardPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <FamilyDashboardHome role="parent" />
    </FamilyDashboardLayout>
  );
}
