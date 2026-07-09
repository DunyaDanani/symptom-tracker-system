"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import MiniCalendar from "@/components/MiniCalendar";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  branch?: string;
  assignedTeacher?: { name: string } | null;
}

const stats = [
  { label: "Total students", value: "—" },
  { label: "Shadow Teacher", value: "—" },
  { label: "Parent message", value: "—" },
  { label: "DOC reviews", value: "—" },
];

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());

  useEffect(() => {
    const fetchStudents = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(data.students.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load students", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/principals/new"
            className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium px-5 py-2.5 rounded"
          >
            + Add Branch Principal
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
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-md shadow-sm px-5 py-6 text-center"
          >
            <p className="text-sm font-semibold text-gray-700">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent students */}
        <div className="bg-amber-50 border border-amber-100 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <Link
              href="/dashboard/admin/students"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all students by branch →
            </Link>
          </div>
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