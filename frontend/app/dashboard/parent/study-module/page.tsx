"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import StudyModuleContent from "@/components/StudyModuleContent";
import BackButton from "@/components/BackButton";

export default function ParentStudyModulePage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />
      <StudyModuleContent role="parent" />
    </FamilyDashboardLayout>
  );
}
