"use client";

import DashboardLayout from "@/components/DashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function AdminMessagesPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel />
    </DashboardLayout>
  );
}
