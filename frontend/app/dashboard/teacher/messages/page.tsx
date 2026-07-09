"use client";

import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";

export default function TeacherMessagesPage() {
  return (
    <TeacherDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Messages</h1>
      <MessagesPanel />
    </TeacherDashboardLayout>
  );
}
