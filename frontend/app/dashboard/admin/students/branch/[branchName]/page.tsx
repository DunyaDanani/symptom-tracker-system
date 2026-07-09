"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  branch: string;
  flagged?: boolean;
  assignedTeacher?: { name: string } | null;
}

const API_BASE = "http://localhost:5000/api";

export default function AdminBranchStudentsPage({
  params,
}: {
  params: Promise<{ branchName: string }>;
}) {
  const { branchName } = use(params);
  const branch = decodeURIComponent(branchName);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(
            data.students.filter((s: Student) => s.branch === branch)
          );
        } else {
          setError(data.message || "Could not load students");
        }
      } catch (err) {
        console.error("Failed to load students", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [branch]);

  return (
    <DashboardLayout>
      <Link
        href="/dashboard/admin/students"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; Back to Branches
      </Link>

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        {branch}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {students.length} student{students.length === 1 ? "" : "s"}
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
          No students at this branch yet.
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Grade
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Shadow Teacher
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  History
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-b border-gray-50">
                  <td className="px-6 py-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-6 py-3">
                    {s.grade}
                    {s.section ? ` · ${s.section}` : ""}
                  </td>
                  <td className="px-6 py-3">
                    {s.assignedTeacher?.name || "Unassigned"}
                  </td>
                  <td className="px-6 py-3">
                    {s.flagged ? (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                        Flagged
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/admin/students/${s._id}/history`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
