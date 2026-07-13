"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import MiniCalendar from "@/components/MiniCalendar";

import { API_BASE } from "@/lib/config";
interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  branch?: string;
  assignedTeacher?: { name: string } | null;
}

interface AdminStats {
  totalStudents: number;
  shadowTeacherCount: number;
  unreadParentMessages: number;
  pendingDocReviews: number;
}

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const [studentsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/staff/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          setStudents(studentsData.students.slice(0, 3));
        }

        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const tiles = [
    {
      label: "Total students",
      value: stats?.totalStudents,
      href: "/dashboard/admin/students",
    },
    {
      label: "Shadow Teacher",
      value: stats?.shadowTeacherCount,
      href: "/dashboard/admin/teachers",
    },
    {
      label: "Parent message",
      value: stats?.unreadParentMessages,
      href: "/dashboard/admin/messages",
    },
    {
      label: "Doc Recommendations",
      value: stats?.pendingDocReviews,
      href: "/dashboard/admin/doc-reviews",
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/principals"
            className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium px-5 py-2.5 rounded"
          >
            Manage Principals
          </Link>
          <Link
            href="/dashboard/admin/students/new"
            className="bg-orange-200 hover:bg-orange-300 transition-colors text-gray-800 text-sm font-medium px-5 py-2.5 rounded"
          >
            + Admit New Student
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {tiles.map((tile) => {
          const card = (
            <div className="bg-white rounded-md shadow-sm px-5 py-6 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-bold text-blue-900">
                {loading ? "—" : tile.value ?? 0}
              </p>
              <p className="text-sm font-semibold text-gray-700 mt-1">
                {tile.label}
              </p>
            </div>
          );

          return tile.href ? (
            <Link key={tile.label} href={tile.href}>
              {card}
            </Link>
          ) : (
            <div key={tile.label} className="cursor-default">
              {card}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent students */}
        <div className="bg-amber-50 border border-amber-100 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Recent Students
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Branch
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Class
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Shadow Teacher
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  History
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-400">
                    No students registered yet.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id} className="border-b border-amber-100/60">
                    <td className="px-4 py-3">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-3">{s.branch || "—"}</td>
                    <td className="px-4 py-3">{s.grade}</td>
                    <td className="px-4 py-3">
                      {s.assignedTeacher?.name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/students/${s._id}/history`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Calendar */}
        <MiniCalendar today={today} />
      </div>
    </DashboardLayout>
  );
}