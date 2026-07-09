"use client";

import ParentDashboardLayout from "@/components/ParentDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function ParentMessagesPage() {
  return (
    <ParentDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel showCompose />
    </ParentDashboardLayout>
  );
}
