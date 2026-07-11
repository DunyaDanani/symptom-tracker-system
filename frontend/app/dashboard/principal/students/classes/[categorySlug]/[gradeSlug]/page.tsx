"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";
import { getCategory, getGrade } from "@/lib/gradeTaxonomy";

import { API_BASE } from "@/lib/config";
interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  flagged?: boolean;
  assignedTeacher?: { name: string } | null;
}

export default function PrincipalClassGradePage({
  params,
}: {
  params: Promise<{ categorySlug: string; gradeSlug: string }>;
}) {
  const { categorySlug, gradeSlug } = use(params);
  const category = getCategory(categorySlug);
  const grade = getGrade(categorySlug, gradeSlug);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/principal/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(
            data.students.filter((s: Student) => s.grade === grade?.label)
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
  }, [grade?.label]);

  if (!category || !grade) {
    return (
      <PrincipalDashboardLayout>
        <p className="text-sm text-gray-400">Unknown grade.</p>
      </PrincipalDashboardLayout>
    );
  }

  return (
    <PrincipalDashboardLayout>
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        {grade.label}
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
          No students in {grade.label} yet.
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
                  Section
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
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Reports
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Profile
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-b border-gray-50">
                  <td className="px-6 py-3">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-6 py-3">{s.section || "—"}</td>
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
                      href={`/dashboard/principal/students/${s._id}/history`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/principal/students/${s._id}/reports`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/principal/students/${s._id}/profile`}
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
    </PrincipalDashboardLayout>
  );
}
