"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import MessagesPanel from "@/components/MessagesPanel";
import BackButton from "@/components/BackButton";

export default function ParentMessagesPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">Messages</h1>
      <MessagesPanel showCompose />
    </FamilyDashboardLayout>
  );
}
