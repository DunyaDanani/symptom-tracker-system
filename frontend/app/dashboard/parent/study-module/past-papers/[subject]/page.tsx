"use client";

import { use } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SubjectDetailContent from "@/components/SubjectDetailContent";

export default function ParentPastPaperSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = use(params);

  return (
    <FamilyDashboardLayout role="parent">
      <SubjectDetailContent
        type="pastPaper"
        subject={decodeURIComponent(subject)}
      />
    </FamilyDashboardLayout>
  );
}
