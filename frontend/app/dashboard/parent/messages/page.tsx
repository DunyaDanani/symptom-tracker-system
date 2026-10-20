"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function ParentMessagesPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel showCompose />
    </FamilyDashboardLayout>
  );
}
