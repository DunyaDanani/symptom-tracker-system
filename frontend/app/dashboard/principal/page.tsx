"use client";

import { useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import MiniCalendar from "@/components/MiniCalendar";

interface Stats {
  totalStudents: number;
  shadowTeacherCount: number;
  flaggedCount: number;
}

interface AttentionStudent {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  assignedTeacher?: { name: string } | null;
  flagged: boolean;
  reasons: string[];
}

const API_BASE = "http://localhost:5000/api";

export default function PrincipalDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attention, setAttention] = useState<AttentionStudent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today] = useState(new Date());
  const [branch, setBranch] = useState("");

  useEffect(() => {
    const storedBranch = localStorage.getItem("branch");
    if (storedBranch) setBranch(storedBranch);
  }, []);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const [statsRes, attentionRes] = await Promise.all([
          fetch(`${API_BASE}/principal/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/principal/attention`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const statsData = await statsRes.json();
        const attentionData = await attentionRes.json();

        if (statsData.success) setStats(statsData.stats);
        if (attentionData.success) setAttention(attentionData.students);

        if (!statsData.success && !attentionData.success) {
          setError("Could not load dashboard data");
        }
      } catch (err) {
        console.error("Failed to load principal dashboard", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-1">Dashboard</h1>
      {branch && (
        <p className="text-sm text-gray-500 mb-8">{branch} Branch</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <UsersIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">
            {loading ? "—" : stats?.totalStudents ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <WarningIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500">Flagged Students</p>
          <p className="text-3xl font-bold text-red-500 mt-1">
            {loading ? "—" : stats?.flaggedCount ?? "—"}
          </p>
        </div>

        <div className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <TeacherIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-gray-500">Shadow Teachers</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {loading ? "—" : stats?.shadowTeacherCount ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students needing attention */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 p-6 pb-4">
            Students Needing Attention
          </h2>

          {error ? (
            <p className="px-6 pb-6 text-red-500 text-sm">{error}</p>
          ) : loading ? (
            <p className="px-6 pb-6 text-gray-400 text-sm">Loading...</p>
          ) : attention.length === 0 ? (
            <p className="px-6 pb-6 text-gray-400 text-sm">
              No students currently need attention.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {attention.map((s) => {
                const isExpanded = expandedId === s._id;
                return (
                  <div key={s._id}>
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : s._id)
                      }
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                          <UsersIcon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {s.firstName} {s.lastName}
                        </span>
                      </span>
                      <ChevronIcon
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 -mt-1">
                        <p className="text-xs text-gray-500 mb-2">
                          Grade {s.grade}
                          {s.section ? ` · ${s.section}` : ""} · Teacher:{" "}
                          {s.assignedTeacher?.name || "Unassigned"}
                        </p>
                        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                          {s.reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar */}
        <MiniCalendar today={today} />
      </div>
    </PrincipalDashboardLayout>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.19c.75 1.334-.213 2.986-1.742 2.986H3.72c-1.53 0-2.493-1.652-1.743-2.986l6.28-11.19zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TeacherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
