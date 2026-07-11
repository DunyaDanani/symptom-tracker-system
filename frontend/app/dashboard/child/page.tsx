"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import FamilyDashboardHome from "@/components/FamilyDashboardHome";

export default function ChildDashboardPage() {
  return (
    <FamilyDashboardLayout role="child">
      <FamilyDashboardHome role="child" />
    </FamilyDashboardLayout>
  );
}
