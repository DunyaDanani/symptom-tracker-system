"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

interface BreadcrumbsProps {
  /**
   * Friendly labels for dynamic route segments (student/teacher/principal
   * IDs, etc.), keyed by the raw segment value as it appears in the URL.
   * e.g. { "64f3a2b1c9d8e7f601234567": "Ayaan Perera" }
   */
  labels?: Record<string, string>;
  className?: string;
  /**
   * Overrides the auto-derived crumbs between "Dashboard" and the current
   * page's own crumb — for pages whose URL doesn't reflect the folder path
   * a user actually drilled through to get there. E.g. a student's History
   * page lives at /dashboard/admin/students/[studentId]/history, but
   * conceptually sits under Branch > Education Stage > Grade, so that page
   * supplies those three as middleCrumbs instead of the literal URL
   * segments ("students", "[studentId]").
   */
  middleCrumbs?: { href: string; label: string }[];
}

// Segments that are purely structural (they exist in the URL to nest
// routes but don't correspond to a page a user would navigate "up" to),
// so they're folded into the crumb that follows them instead of getting
// their own entry.
const SKIP_SEGMENTS = new Set(["branch", "classes"]);

// Static labels for known route segments, keyed by the segment as it
// appears in the URL. Shared across all roles.
const SEGMENT_LABELS: Record<string, string> = {
  students: "Students",
  teachers: "Teachers",
  principals: "Principals",
  messages: "Messages",
  notice: "Notice",
  alerts: "Alerts",
  account: "Account",
  new: "Add New",
  history: "History",
  profile: "Profile",
  reports: "Reports",
  symptoms: "Symptoms",
  emotion: "Emotion",
  "doctor-documents": "Doctor's Recommendation",
  "doc-reviews": "Doctor's Recommendation",
  modules: "Modules",
  "past-papers": "Past Papers",
  flagged: "Flagged Students",
  "emotion-tracking": "Emotion Tracking",
  "upload-modules": "Upload Modules",
  "emotion-history": "Emotion History",
  "symptom-history": "Symptom History",
  "break-activities": "Break Activities",
  "study-module": "Study Module",
  "activity-plan": "My Activities",
  "emotion-checkin": "Emotion Check-in",
  "teacher-requests": "Teacher Requests",
};

// Full-path overrides for spots where a segment means something different
// depending on which section of the app it's in — e.g. the admin sidebar
// calls its student section "Branches", so the breadcrumb should match.
const PATH_LABELS: Record<string, string> = {
  "/dashboard/admin/students": "Branches",
};

const ID_LIKE = /^[a-f0-9]{20,}$/i;

function formatSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Breadcrumbs({ labels, className, middleCrumbs }: BreadcrumbsProps) {
  const pathname = usePathname();
  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  // Expect paths like /dashboard/<role>/... — bail out on anything shorter.
  if (segments.length < 2 || segments[0] !== "dashboard") return null;

  const dashboardHref = `/${segments[0]}/${segments[1]}`;
  const crumbs: { href: string; label: string }[] = [
    { href: dashboardHref, label: "Dashboard" },
  ];

  if (middleCrumbs) {
    crumbs.push(...middleCrumbs);

    // Still resolve the page's own crumb (the final URL segment) the
    // normal way, so its label keeps working via `labels`/SEGMENT_LABELS.
    const lastSegment = segments[segments.length - 1];
    const label =
      labels?.[lastSegment] ||
      PATH_LABELS[pathname] ||
      SEGMENT_LABELS[lastSegment] ||
      (ID_LIKE.test(lastSegment) ? "Details" : formatSegment(lastSegment));

    crumbs.push({ href: pathname, label });
  } else {
    let href = dashboardHref;
    for (let i = 2; i < segments.length; i++) {
      const segment = segments[i];
      href += `/${segment}`;
      if (SKIP_SEGMENTS.has(segment)) continue;

      const label =
        labels?.[segment] ||
        PATH_LABELS[href] ||
        SEGMENT_LABELS[segment] ||
        (ID_LIKE.test(segment) ? "Details" : formatSegment(segment));

      crumbs.push({ href, label });
    }
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-6 flex items-center flex-wrap gap-1.5 text-sm text-gray-500 ${className ?? ""}`}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            )}
            {isLast ? (
              <span className="text-gray-700 font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-blue-700 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
