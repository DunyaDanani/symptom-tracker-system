"use client";

import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import StudyModuleContent from "@/components/StudyModuleContent";
import BackButton from "@/components/BackButton";

export default function ChildStudyModulePage() {
  return (
    <FamilyDashboardLayout role="child">
      <BackButton />
      <StudyModuleContent role="child" />
    </FamilyDashboardLayout>
  );
}
