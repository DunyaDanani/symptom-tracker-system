"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  flagged?: boolean;
  assignedTeacher?: { name: string } | null;
}

export default function PrincipalStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/principal/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
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
  }, []);

  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Students</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Grade</th>
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Shadow Teacher
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-700">History</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Reports</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-gray-400">
                    No students registered yet.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-3">{s.grade}</td>
                    <td className="px-4 py-3">
                      {s.assignedTeacher?.name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      {s.flagged ? (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                          Flagged
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/principal/students/${s._id}/history`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/principal/students/${s._id}/reports`}
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
      )}
    </PrincipalDashboardLayout>
  );
}
