"use client";

import { use } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SubjectDetailContent from "@/components/SubjectDetailContent";
import BackButton from "@/components/BackButton";

export default function ParentModuleSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = use(params);

  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />
      <SubjectDetailContent type="module" subject={decodeURIComponent(subject)} />
    </FamilyDashboardLayout>
  );
}
