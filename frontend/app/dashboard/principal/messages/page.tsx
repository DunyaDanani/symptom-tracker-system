"use client";

import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function PrincipalMessagesPage() {
  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel />
    </PrincipalDashboardLayout>
  );
}
