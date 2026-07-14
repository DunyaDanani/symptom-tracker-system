"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MiniCalendar from "@/components/MiniCalendar";

import { API_BASE } from "@/lib/config";

type EligibilityStatus = "pending" | "eligible" | "not_eligible";

interface LinkedStudent {
  _id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
  examEligibility?: EligibilityStatus;
  assignedTeacher?: { name: string } | null;
  parentUser?: { name: string } | null;
  studentUser?: { name: string } | null;
}

const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  pending: "Not yet decided",
  eligible: "Eligible",
  not_eligible: "Not eligible",
};

// Shared dashboard home for the Parent and Child roles — same shell, same
// quick-link tiles and student info card, just angled slightly differently
// per role (a parent tracks their child's history; the child logs their
// own check-ins) via the `role` prop.
export default function FamilyDashboardHome({
  role,
}: {
  role: "parent" | "child";
}) {
  const [student, setStudent] = useState<LinkedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/students/linked`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudent(data.student);
        } else {
          setError(data.message || "Could not load the linked profile");
        }
      } catch (err) {
        console.error("Failed to load linked profile", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const basePath = `/dashboard/${role}`;

  const tiles =
    role === "parent"
      ? [
          {
            label: "Emotion Tracker",
            icon: EmotionIcon,
            color: "bg-pink-50 text-pink-600",
            href: `${basePath}/emotion-history`,
          },
          {
            label: "Symptom Tracking",
            icon: SymptomIcon,
            color: "bg-orange-50 text-orange-600",
            href: `${basePath}/symptom-history`,
          },
          {
            label: "Break Time",
            icon: BreakTimeIcon,
            color: "bg-amber-50 text-amber-600",
            href: `${basePath}/break-activities`,
          },
          {
            label: "Study Module",
            icon: StudyIcon,
            color: "bg-blue-50 text-blue-600",
            href: `${basePath}/study-module`,
          },
          {
            label: "Reports",
            icon: ReportsIcon,
            color: "bg-emerald-50 text-emerald-600",
            href: `${basePath}/reports`,
          },
        ]
      : // Child dashboard: only the things a child actually uses day to
        // day, in the order they naturally happen — check in with an
        // emoji, see what's suggested for today, then open school work.
        // "Serious" adult-facing content (Reports, Messages) lives on the
        // parent side instead, per the 20 Feb 2026 client meeting.
        [
          {
            label: "Emotion Tracker",
            icon: EmotionIcon,
            color: "bg-pink-100 text-pink-600",
            href: `${basePath}/emotion-checkin`,
          },
          {
            label: "My Activities",
            icon: ActivityIcon,
            color: "bg-yellow-100 text-yellow-600",
            href: `${basePath}/activity-plan`,
          },
          {
            label: "Study Module",
            icon: StudyIcon,
            color: "bg-blue-100 text-blue-600",
            href: `${basePath}/study-module`,
          },
        ];

  if (role === "child") {
    return (
      <>
        <h1 className="text-3xl font-bold text-blue-900 mb-1">
          Hi {student?.firstName || "there"}! 👋
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Pick something fun to do today ✨
        </p>

        {/* Icon tiles — bigger, brighter, bouncier for kids */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {tiles.map((tile) => (
            <Link key={tile.label} href={tile.href}>
              <div className="bg-white rounded-3xl shadow-sm px-6 py-8 flex flex-col items-center gap-3 text-center hover:shadow-lg hover:-translate-y-1 transition-all border-2 border-transparent hover:border-sky-100">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${tile.color}`}
                >
                  <tile.icon className="w-9 h-9" />
                </div>
                <p className="text-base font-bold text-gray-700 text-center">
                  {tile.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">
              🧒 About Me
            </h2>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading...</p>
            ) : error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : student ? (
              <dl className="space-y-3 text-sm">
                <Row label="Admission Number" value={student.admissionNumber} />
                <Row
                  label="Name"
                  value={`${student.firstName} ${student.lastName}`}
                />
                <Row label="Grade" value={student.grade} />
                {student.section && (
                  <Row label="Section" value={student.section} />
                )}
                <Row
                  label="Shadow Teacher"
                  value={student.assignedTeacher?.name || "Unassigned"}
                />
                <Row
                  label="Parent/Guardian"
                  value={student.parentUser?.name || "—"}
                />
              </dl>
            ) : null}
          </div>

          <MiniCalendar today={today} />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Dashboard</h1>

      {/* Icon tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <div className="bg-white rounded-md shadow-sm px-5 py-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${tile.color}`}
              >
                <tile.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">
                {tile.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student info card */}
        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            My Child
          </h2>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : student ? (
            <dl className="space-y-3 text-sm">
              <Row label="Admission Number" value={student.admissionNumber} />
              <Row
                label="Name"
                value={`${student.firstName} ${student.lastName}`}
              />
              <Row label="Grade" value={student.grade} />
              {student.section && <Row label="Section" value={student.section} />}
              <Row label="Diagnosis" value={student.diagnosis} />
              <Row label="Communication" value={student.communicationLevel} />
              <Row
                label="Shadow Teacher"
                value={student.assignedTeacher?.name || "Unassigned"}
              />
              <Row
                label="Exam Eligibility"
                value={ELIGIBILITY_LABEL[student.examEligibility || "pending"]}
              />
            </dl>
          ) : null}
        </div>

        <MiniCalendar today={today} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}

function EmotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2zm-7.536 5.879a1 1 0 011.415 0 3 3 0 004.242 0 1 1 0 111.415 1.415 5 5 0 01-7.072 0 1 1 0 010-1.415z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SymptomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 00-1 1v1H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H9zm0 7a1 1 0 012 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V9z" />
    </svg>
  );
}

function BreakTimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StudyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM8 7a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M12 2a1 1 0 01.967.744L14.146 7.2 17.5 8.5a1 1 0 010 1.864l-3.354 1.3-1.18 4.455a1 1 0 01-1.933 0L9.854 11.664 6.5 10.364a1 1 0 010-1.864l3.354-1.3L11.033 2.744A1 1 0 0112 2zM5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  );
}
 