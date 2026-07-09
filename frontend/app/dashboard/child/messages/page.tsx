"use client";

import ChildDashboardLayout from "@/components/ChildDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function ChildMessagesPage() {
  return (
    <ChildDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel showCompose />
    </ChildDashboardLayout>
  );
}
