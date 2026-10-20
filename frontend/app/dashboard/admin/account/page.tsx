"use client";

import DashboardLayout from "@/components/DashboardLayout";
import AccountProfile from "@/components/AccountProfile";

export default function AdminAccountPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        My Account
      </h1>
      <AccountProfile />
    </DashboardLayout>
  );
}
