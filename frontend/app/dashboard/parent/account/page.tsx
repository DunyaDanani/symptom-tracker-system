"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import AccountProfile from "@/components/AccountProfile";

export default function ParentAccountPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        My Account
      </h1>
      <AccountProfile />
    </FamilyDashboardLayout>
  );
}
