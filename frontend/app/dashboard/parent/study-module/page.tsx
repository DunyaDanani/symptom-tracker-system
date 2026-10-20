"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import StudyModuleContent from "@/components/StudyModuleContent";

export default function ParentStudyModulePage() {
  return (
    <FamilyDashboardLayout role="parent">
      <StudyModuleContent role="parent" />
    </FamilyDashboardLayout>
  );
}
