"use client";

import { useState } from "react";
import { openAuthenticatedFile } from "@/lib/fileAccess";

import { API_BASE } from "@/lib/config";

interface ResourceFile {
  _id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
}

interface TopicGroup {
  topic: string;
  files: ResourceFile[];
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

function ChevronIcon({ className }: { className?: string }) {
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.25 4.5a.75.75 0 00-1.5 0v10a.75.75 0 001.5 0v-10zM4.5 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1h-.5a1 1 0 01-1-1V5zM12 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1H13a1 1 0 01-1-1V5z" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
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

// Modules — subject cards that expand into a topic accordion below the grid.
export function ModuleSubjectGrid({ groups }: { groups: ModuleSubjectGroup[] }) {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [openTopic, setOpenTopic] = useState<Record<string, boolean>>({});

  const toggleTopic = (key: string) => {
    setOpenTopic((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeGroup = groups.find((g) => g.subject === activeSubject) || null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groups.map((group, i) => {
          const fileCount = group.topics.reduce(
            (sum, t) => sum + t.files.length,
            0
          );
          const isActive = activeSubject === group.subject;

          return (
            <div
              key={group.subject}
              className={`bg-white border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${
                isActive
                  ? "border-blue-400 ring-1 ring-blue-300"
                  : "border-gray-100"
              }`}
            >
              <SubjectCover index={i} />
              <div className="p-4 flex flex-col flex-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSubject(isActive ? null : group.subject)
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline text-left"
                >
                  {group.subject}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  {fileCount} file{fileCount !== 1 ? "s" : ""}
                </p>
                <div className="flex justify-end mt-auto pt-3">
                  <KebabIcon className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeGroup && (
        <div className="bg-white border border-gray-100 rounded-md mt-6 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            {activeGroup.subject}
          </h3>
          {activeGroup.topics.length === 0 ? (
            <p className="text-xs text-gray-400">
              No modules in this subject yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {activeGroup.topics.map((t) => {
                const topicKey = `${activeGroup.subject}::${t.topic}`;
                return (
                  <div
                    key={topicKey}
                    className="border border-gray-100 rounded-md overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTopic(topicKey)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <ChevronIcon
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                            openTopic[topicKey] ? "rotate-90" : ""
                          }`}
                        />
                        {t.topic}
                      </span>
                      <span className="text-xs text-gray-400">
                        {t.files.length} file{t.files.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {openTopic[topicKey] && (
                      <div className="divide-y divide-gray-50">
                        {t.files.map((f) => (
                          <button
                            type="button"
                            key={f._id}
                            onClick={() =>
                              openAuthenticatedFile(
                                `${API_BASE}/study-modules/${f._id}/file`
                              )
                            }
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 w-full text-left"
                          >
                            <BookIcon className="w-4 h-4 text-gray-400" />
                            {f.fileName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Past Papers — same card grid, expanding into a flat file list below.
export function PastPaperSubjectGrid({
  groups,
}: {
  groups: PastPaperSubjectGroup[];
}) {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const activeGroup = groups.find((g) => g.subject === activeSubject) || null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {groups.map((group, i) => {
          const isActive = activeSubject === group.subject;

          return (
            <div
              key={group.subject}
              className={`bg-white border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${
                isActive
                  ? "border-blue-400 ring-1 ring-blue-300"
                  : "border-gray-100"
              }`}
            >
              <SubjectCover index={i + 2} />
              <div className="p-4 flex flex-col flex-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSubject(isActive ? null : group.subject)
                  }
                  className="text-sm font-semibold text-blue-700 hover:underline text-left"
                >
                  {group.subject}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  {group.files.length} file
                  {group.files.length !== 1 ? "s" : ""}
                </p>
                <div className="flex justify-end mt-auto pt-3">
                  <KebabIcon className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeGroup && (
        <div className="bg-white border border-gray-100 rounded-md mt-6 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            {activeGroup.subject}
          </h3>
          {activeGroup.files.length === 0 ? (
            <p className="text-xs text-gray-400">
              No past papers in this subject yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeGroup.files.map((f) => (
                <button
                  type="button"
                  key={f._id}
                  onClick={() =>
                    openAuthenticatedFile(
                      `${API_BASE}/study-modules/${f._id}/file`
                    )
                  }
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 w-full text-left"
                >
                  <PaperclipIcon className="w-4 h-4 text-gray-400" />
                  {f.fileName}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
