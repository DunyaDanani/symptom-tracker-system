"use client";

import { use } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SubjectDetailContent from "@/components/SubjectDetailContent";
import BackButton from "@/components/BackButton";

export default function ChildPastPaperSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = use(params);

  return (
    <FamilyDashboardLayout role="child">
      <BackButton />
      <SubjectDetailContent
        type="pastPaper"
        subject={decodeURIComponent(subject)}
      />
    </FamilyDashboardLayout>
  );
}
