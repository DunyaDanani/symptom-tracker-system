"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdmitStudentModal from "@/components/AdmitStudentModal";

// Admitting a student now happens in a pop-up (see AdmitStudentModal),
// triggered from the "+ Admit New Student" button on the admin dashboard.
// This route is kept as a direct-link fallback: it opens the same modal
// on top of the dashboard shell and returns to the dashboard on close.
export default function AdmitStudentPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <AdmitStudentModal
        open
        onClose={() => router.push("/dashboard/admin")}
      />
    </DashboardLayout>
  );
}
