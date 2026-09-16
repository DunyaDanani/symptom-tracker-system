"use client";

import Link from "next/link";
import BackButton from "./BackButton";

interface SubpageAction {
  href: string;
  label: string;
  /**
   * "primary" = solid blue — this is the main next step on a read-only
   * page (e.g. "+ Log Symptom" on the History view).
   * "secondary" = outlined — this is a cross-link to another view (e.g.
   * "View Full History" from the log form), kept visually lighter so
   * "do this" and "go look at that" are distinguishable at a glance.
   * Defaults to "primary".
   */
  emphasis?: "primary" | "secondary";
}

interface SubpageHeaderProps {
  title: string;
  subtitle: string;
  action?: SubpageAction;
}

const PRIMARY_CLASSES =
  "bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded whitespace-nowrap";
const SECONDARY_CLASSES =
  "inline-flex items-center gap-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium px-4 py-2 rounded whitespace-nowrap";

// Shared header for a student sub-page (symptoms, emotion, ...). Bundles
// back-navigation (inline with the title, not floating alone above it),
// the page title, the student subtitle line, and the cross-link to the
// paired Log/History view — so that boilerplate isn't re-typed on every
// page. Each page keeps its own data-loading and its own body content;
// this only replaces the header markup.
export default function SubpageHeader({
  title,
  subtitle,
  action,
}: SubpageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <BackButton label="" className="p-1 -ml-1 rounded hover:bg-gray-100" />
          <h1 className="text-2xl font-semibold text-blue-900">{title}</h1>
        </div>
        {action && (
          <Link
            href={action.href}
            className={
              action.emphasis === "secondary"
                ? SECONDARY_CLASSES
                : PRIMARY_CLASSES
            }
          >
            {action.label}
          </Link>
        )}
      </div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
