"use client";

import { useRouter } from "next/navigation";

// Universal "back" control — uses browser history instead of a hardcoded
// route, so it always returns to wherever the user actually came from
// (a student list, a search result, another sub-page, etc.) instead of
// forcing a trip back to the dashboard home every time.
export default function BackButton({
  label = "Back",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 rounded-full pl-2.5 pr-4 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 text-gray-500"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </button>
  );
}
