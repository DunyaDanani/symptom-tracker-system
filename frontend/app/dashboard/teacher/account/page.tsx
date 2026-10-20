"use client";

import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import AccountProfile from "@/components/AccountProfile";

export default function TeacherAccountPage() {
  return (
    <TeacherDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        My Account
      </h1>
      <AccountProfile />
    </TeacherDashboardLayout>
  );
}
