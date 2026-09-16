"use client";

import { useRouter, usePathname } from "next/navigation";

// Universal "back" control — uses browser history instead of a hardcoded
// route, so it always returns to wherever the user actually came from
// (a student list, a search result, another sub-page, etc.) instead of
// forcing a trip back to the dashboard home every time.
//
// Styled as a low-emphasis inline link (not a solid pill) so it reads as
// a secondary nav affordance alongside the breadcrumb trail above it,
// rather than competing with the page's primary action button. Callers
// are expected to place it inline with the page title/header row instead
// of floating alone above the content.
export default function BackButton({
  label = "Back",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    // router.back() silently no-ops if this tab has no prior in-app
    // history (e.g. the page was opened via a bookmark, a shared link,
    // or a hard refresh) — falling through to nothing happening is
    // confusing. In that case, fall back to this role's dashboard root
    // (derived the same way Breadcrumbs.tsx does: /dashboard/<role>)
    // rather than leaving the button dead.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const fallback =
      segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : "/";
    router.push(fallback);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label || "Go back"}
      title={label || "Go back"}
      className={`inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
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
