"use client";

import Link from "next/link";

export interface ResourceFile {
  _id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  // True when the current logged-in account is the one that uploaded this
  // file — the API computes this per-request so the UI never has to know
  // its own user id. Only the uploader gets Edit/Delete on that file.
  isOwner?: boolean;
}

// Each topic carries the teacher's own module files plus any submissions
// the child/parent has turned in for that same topic — submissions live
// nested here rather than in their own separate section.
export interface TopicGroup {
  topic: string;
  files: ResourceFile[];
  submissions: ResourceFile[];
}

export interface ModuleSubjectGroup {
  subject: string;
  topics: TopicGroup[];
}

export interface PastPaperSubjectGroup {
  subject: string;
  files: ResourceFile[];
}

// Course-card style covers — a gradient plus a light SVG texture, cycled
// across the fixed subject folders so each card reads as a distinct "course".
const COVERS: { className: string; pattern: "triangles" | "mosaic" | "hexagons-light" | "circles" | "hexagons" }[] = [
  { className: "bg-gradient-to-br from-blue-400 to-blue-600", pattern: "triangles" },
  { className: "bg-gradient-to-br from-violet-400 to-purple-600", pattern: "mosaic" },
  { className: "bg-gradient-to-br from-slate-100 to-slate-300", pattern: "hexagons-light" },
  { className: "bg-gradient-to-br from-teal-300 to-emerald-400", pattern: "circles" },
  { className: "bg-gradient-to-br from-sky-400 to-blue-500", pattern: "hexagons" },
];

function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function CoverPattern({ type }: { type: (typeof COVERS)[number]["pattern"] }) {
  const common = "absolute inset-0 w-full h-full opacity-30";

  if (type === "triangles") {
    return (
      <svg className={common} viewBox="0 0 200 100" preserveAspectRatio="none">
        <polygon points="0,100 40,20 80,100" fill="white" />
        <polygon points="40,100 80,30 120,100" fill="white" opacity="0.6" />
        <polygon points="90,100 130,10 170,100" fill="white" />
        <polygon points="140,100 180,40 210,100" fill="white" opacity="0.6" />
      </svg>
    );
  }

  if (type === "mosaic") {
    const cells = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 15; col++) {
        if ((row + col) % 3 === 0) {
          cells.push(
            <rect
              key={`${row}-${col}`}
              x={col * 14}
              y={row * 14}
              width={12}
              height={12}
              fill="white"
            />
          );
        }
      }
    }
    return (
      <svg className={common} viewBox="0 0 200 100">
        {cells}
      </svg>
    );
  }

  if (type === "circles") {
    return (
      <svg className={common} viewBox="0 0 200 100">
        <circle cx="30" cy="30" r="35" fill="white" opacity="0.5" />
        <circle cx="90" cy="65" r="45" fill="white" opacity="0.4" />
        <circle cx="160" cy="20" r="30" fill="white" opacity="0.5" />
        <circle cx="185" cy="85" r="25" fill="white" opacity="0.4" />
      </svg>
    );
  }

  // hexagons / hexagons-light
  const hexes = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      hexes.push(
        <polygon
          key={`${row}-${col}`}
          points={hexPoints(col * 26 + (row % 2 ? 13 : 0), row * 22, 13)}
          fill={type === "hexagons-light" ? "#94a3b8" : "white"}
        />
      );
    }
  }
  return (
    <svg className={common} viewBox="0 0 200 100">
      {hexes}
    </svg>
  );
}

function SubjectCover({ index }: { index: number }) {
  const cover = COVERS[index % COVERS.length];
  return (
    <div className={`relative h-24 overflow-hidden shrink-0 ${cover.className}`}>
      <CoverPattern type={cover.pattern} />
    </div>
  );
}

function KebabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.25 4.5a.75.75 0 00-1.5 0v10a.75.75 0 001.5 0v-10zM4.5 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1h-.5a1 1 0 01-1-1V5zM12 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1H13a1 1 0 01-1-1V5z" />
    </svg>
  );
}

export function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
      />
    </svg>
  );
}

export function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 4.5l3.75 3.75"
      />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

export function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

// Modules — subject cards that now navigate to a dedicated page for that
// subject (basePath + "/modules/<subject>") instead of expanding an
// accordion in place, so "open a subject" is a real page with its own URL
// and back-button history rather than client-side toggle state.
export function ModuleSubjectGrid({
  groups,
  basePath,
}: {
  groups: ModuleSubjectGroup[];
  basePath: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {groups.map((group, i) => {
        const fileCount = group.topics.reduce(
          (sum, t) => sum + t.files.length,
          0
        );

        return (
          <Link
            key={group.subject}
            href={`${basePath}/modules/${encodeURIComponent(group.subject)}`}
            className="text-left bg-white border border-gray-100 rounded-md overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 active:shadow-inner active:bg-blue-50/40 active:translate-y-0 transition-all"
          >
            <SubjectCover index={i} />
            <div className="p-4 flex flex-col flex-1">
              <span className="text-sm font-semibold text-blue-700">
                {group.subject}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {fileCount} file{fileCount !== 1 ? "s" : ""}
              </p>
              <div className="flex justify-end mt-auto pt-3">
                <KebabIcon className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Past Papers — same card grid, navigating to basePath + "/past-papers/<subject>".
export function PastPaperSubjectGrid({
  groups,
  basePath,
}: {
  groups: PastPaperSubjectGroup[];
  basePath: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {groups.map((group, i) => (
        <Link
          key={group.subject}
          href={`${basePath}/past-papers/${encodeURIComponent(group.subject)}`}
          className="text-left bg-white border border-gray-100 rounded-md overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 active:shadow-inner active:bg-blue-50/40 active:translate-y-0 transition-all"
        >
          <SubjectCover index={i + 2} />
          <div className="p-4 flex flex-col flex-1">
            <span className="text-sm font-semibold text-blue-700">
              {group.subject}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {group.files.length} file
              {group.files.length !== 1 ? "s" : ""}
            </p>
            <div className="flex justify-end mt-auto pt-3">
              <KebabIcon className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
