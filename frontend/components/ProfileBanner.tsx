import { ReactNode } from "react";
import { BTN_SECONDARY } from "@/lib/ui";

// Plain profile header for student and shadow-teacher pages: the person's
// name, a few "Label: value" facts on one wrapping line, optional badges
// beside the name and optional actions (e.g. "View Profile") on the right.
// Deliberately quiet (white card, no avatar or coloured background) so it
// reads like the rest of the page.

export interface ProfileBannerLine {
  label: string;
  value?: string | number | null;
}

export default function ProfileBanner({
  name,
  lines = [],
  badges,
  actions,
  className = "",
}: {
  name: string;
  lines?: ProfileBannerLine[];
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Kept for older callers; no longer changes the layout. */
  compact?: boolean;
}) {
  const visibleLines = lines.filter(
    (l) => l.value !== undefined && l.value !== null && l.value !== ""
  );

  return (
    <div
      className={`bg-white rounded-md shadow-sm px-6 py-5 flex items-start justify-between gap-4 flex-wrap ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-semibold text-gray-800 break-words">{name}</h2>
          {badges}
        </div>
        {visibleLines.length > 0 && (
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {visibleLines.map((l) => (
              <div key={l.label} className="flex gap-1.5">
                <dt className="text-gray-500">{l.label}:</dt>
                <dd className="text-gray-800 font-medium">{l.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// Buttons placed in `actions` use the standard outlined button.
export const BANNER_ACTION_CLASSES = BTN_SECONDARY;

// Badge styling (flagged, eligibility, etc.).
export const BANNER_BADGE_CLASSES =
  "text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700";
