"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import {
  getCategory,
  categoryForGrade,
  UNGROUPED_CATEGORY,
} from "@/lib/gradeTaxonomy";
import { API_BASE } from "@/lib/config";

interface Student {
  _id: string;
  admissionNumber?: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  branch: string;
  flagged?: boolean;
  assignedTeacher?: { name: string } | null;
}

export default function AdminBranchCategoryPage({
  params,
}: {
  params: Promise<{ branchName: string; categorySlug: string }>;
}) {
  const { branchName, categorySlug } = use(params);
  const branch = decodeURIComponent(branchName);
  const category =
    categorySlug === UNGROUPED_CATEGORY.slug
      ? UNGROUPED_CATEGORY
      : getCategory(categorySlug);

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
            data.students.filter((s: Student) => {
              if (s.branch !== branch) return false;
              if (categorySlug === UNGROUPED_CATEGORY.slug) {
                return !categoryForGrade(s.grade);
              }
              return categoryForGrade(s.grade)?.slug === categorySlug;
            })
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
  }, [branch, categorySlug]);

  if (!category) {
    return (
      <DashboardLayout>
        <p className="text-sm text-gray-400">Unknown category.</p>
      </DashboardLayout>
    );
  }

  const countForGrade = (gradeLabel: string) =>
    students.filter((s) => s.grade === gradeLabel).length;

  return (
    <DashboardLayout>
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        {category.label}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {students.length} student{students.length === 1 ? "" : "s"}
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : category.slug === UNGROUPED_CATEGORY.slug ? (
        <StudentTable students={students} branch={branch} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {category.grades.map((grade) => (
            <Link
              key={grade.slug}
              href={`/dashboard/admin/students/branch/${encodeURIComponent(
                branch
              )}/${categorySlug}/${grade.slug}`}
              className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <FolderIcon className="w-12 h-12 text-amber-400" />
              <p className="text-sm font-semibold text-gray-800 text-center">
                {grade.label}
              </p>
              <p className="text-xs text-gray-400">
                {countForGrade(grade.label)} student
                {countForGrade(grade.label) === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function StudentTable({
  students,
}: {
  students: Student[];
  branch: string;
}) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
        No students here yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-6 py-3 font-semibold text-gray-700">
              Admission No.
            </th>
            <th className="px-6 py-3 font-semibold text-gray-700">Name</th>
            <th className="px-6 py-3 font-semibold text-gray-700">Grade</th>
            <th className="px-6 py-3 font-semibold text-gray-700">
              Shadow Teacher
            </th>
            <th className="px-6 py-3 font-semibold text-gray-700">Status</th>
            <th className="px-6 py-3 font-semibold text-gray-700">
              History
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id} className="border-b border-gray-50">
              <td className="px-6 py-3 text-gray-500">
                {s.admissionNumber || "—"}
              </td>
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
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}
