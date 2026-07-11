"use client";

import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";
import BackButton from "@/components/BackButton";

export default function TeacherMessagesPage() {
  return (
    <TeacherDashboardLayout>
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">Messages</h1>
      <MessagesPanel showCompose />
    </TeacherDashboardLayout>
  );
}
