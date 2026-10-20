import { ReactNode } from "react";

// Blue profile header used for students and shadow teachers: a large
// ringed avatar, the person's name and a few "Label : value" lines.
// Optional badges sit next to the name; optional actions (e.g. "View
// Profile") sit in the top-right corner.
//
// `compact` is for a half-width grid cell (e.g. beside the dashboard
// calendar): the content stacks and is centred so it fills the cell's
// height evenly instead of leaving empty bands above and below.

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
  compact = false,
}: {
  name: string;
  lines?: ProfileBannerLine[];
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const visibleLines = lines.filter(
    (l) => l.value !== undefined && l.value !== null && l.value !== ""
  );

  const details = (
    <dl
      className={`mt-2 space-y-0.5 text-sm text-white/95 ${compact ? "text-center" : ""}`}
    >
      {visibleLines.map((l) => (
        <div key={l.label}>
          <dt className="inline">{l.label}</dt>
          <span> : </span>
          <dd className="inline">{l.value}</dd>
        </div>
      ))}
    </dl>
  );

  const actionsBlock = actions ? (
    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end sm:absolute sm:top-4 sm:right-4">
      {actions}
    </div>
  ) : null;

  if (compact) {
    return (
      <div
        className={`relative h-full bg-[#5b96d5] rounded-md shadow-sm px-6 py-8 flex flex-col items-center justify-center text-white ${className}`}
      >
        <PersonAvatar size="w-28 h-28" />
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <h2 className="text-2xl font-normal leading-tight text-center break-words">
            {name}
          </h2>
          {badges}
        </div>
        {visibleLines.length > 0 && details}
        {actionsBlock && <div className="mt-4 sm:mt-0">{actionsBlock}</div>}
      </div>
    );
  }

  return (
    <div
      className={`relative bg-[#5b96d5] rounded-md shadow-sm px-6 py-6 sm:px-8 flex flex-col sm:flex-row items-center gap-6 text-white ${className}`}
    >
      <PersonAvatar size="w-32 h-32" />

      <div
        className={`flex-1 min-w-0 text-center sm:text-left ${actions ? "sm:pr-40" : ""}`}
      >
        <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
          <h1 className="text-2xl font-normal leading-tight break-words">{name}</h1>
          {badges}
        </div>
        {visibleLines.length > 0 && details}
      </div>

      {actionsBlock}
    </div>
  );
}

// Classes for buttons placed in `actions`, readable on the blue.
export const BANNER_ACTION_CLASSES =
  "text-sm font-medium px-4 py-2 rounded bg-white/15 hover:bg-white/25 text-white border border-white/40 transition-colors whitespace-nowrap";

// Badge styling (flagged, eligibility, etc.) on the blue background.
export const BANNER_BADGE_CLASSES =
  "text-xs font-medium px-2.5 py-1 rounded-full bg-white text-blue-800";

function PersonAvatar({ size }: { size: string }) {
  return (
    <div className={`shrink-0 ${size} rounded-full bg-white p-2 shadow-sm`}>
      <div className="w-full h-full rounded-full border border-[#5b96d5]/40 p-1">
        <div className="w-full h-full rounded-full bg-[#8fb6e3] overflow-hidden flex items-end justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-[88%] h-[88%] text-white"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="50" cy="36" r="20" />
            <path d="M12 100c0-22 17-36 38-36s38 14 38 36z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
