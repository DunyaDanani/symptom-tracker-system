"use client";

import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import AccountProfile from "@/components/AccountProfile";

export default function PrincipalAccountPage() {
  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        My Account
      </h1>
      <AccountProfile />
    </PrincipalDashboardLayout>
  );
}
