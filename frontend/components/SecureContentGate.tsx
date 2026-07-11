"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

// Lightweight confirmation gate that replaces the old PIN-entry PinGate.
// Shows a one-time "Secure Content Access" notice before rendering the
// sensitive content. Cancel sends the user back where they came from;
// Continue reveals the page.
export default function SecureContentGate({
  subject,
  children,
}: {
  subject: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-md shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
          <span>🔒</span> Secure Content Access
        </h2>

        <p className="text-sm text-gray-700 mt-4">
          You are about to view your child&apos;s {subject}.
        </p>
        <p className="text-sm text-gray-500 mt-3">
          This information contains sensitive personal data and is intended
          only for the registered parent or authorized guardian.
        </p>
        <p className="text-sm text-gray-500 mt-3">
          Please ensure you are accessing this information in a private and
          secure environment.
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm border border-gray-200 rounded-full px-5 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setConfirmed(true)}
            className="text-sm bg-blue-900 hover:bg-blue-800 text-white rounded-full px-5 py-1.5"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
