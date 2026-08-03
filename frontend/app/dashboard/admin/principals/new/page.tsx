"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AddPrincipalModal from "@/components/AddPrincipalModal";

// Adding a principal now happens in a pop-up (see AddPrincipalModal),
// triggered from the "+ Add Branch Principal" button on the principals
// list. This route is kept as a direct-link fallback: it opens the same
// modal on top of the dashboard shell and returns to the principals list
// on close.
export default function CreatePrincipalPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <AddPrincipalModal
        open
        onClose={() => router.push("/dashboard/admin/principals")}
      />
    </DashboardLayout>
  );
}
