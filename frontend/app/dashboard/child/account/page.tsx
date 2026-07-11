"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import AccountProfile from "@/components/AccountProfile";
import BackButton from "@/components/BackButton";

export default function ChildAccountPage() {
  return (
    <FamilyDashboardLayout role="child">
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        My Account
      </h1>
      <AccountProfile />
    </FamilyDashboardLayout>
  );
}
