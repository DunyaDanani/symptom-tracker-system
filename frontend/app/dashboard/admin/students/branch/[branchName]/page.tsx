"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import {
  GRADE_TAXONOMY,
  UNGROUPED_CATEGORY,
  categoryForGrade,
} from "@/lib/gradeTaxonomy";
import { API_BASE } from "@/lib/config";

interface Student {
  _id: string;
  branch: string;
  grade: string;
}

export default function AdminBranchCategoriesPage({
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

  const countForCategory = (categorySlug: string) =>
    students.filter((s) => categoryForGrade(s.grade)?.slug === categorySlug)
      .length;

  const ungroupedCount = students.filter(
    (s) => !categoryForGrade(s.grade)
  ).length;

  return (
    <DashboardLayout>
      <BackButton />

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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GRADE_TAXONOMY.map((category) => (
            <Link
              key={category.slug}
              href={`/dashboard/admin/students/branch/${encodeURIComponent(
                branch
              )}/${category.slug}`}
              className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <FolderIcon className="w-12 h-12 text-blue-400" />
              <p className="text-sm font-semibold text-gray-800 text-center">
                {category.label}
              </p>
              <p className="text-xs text-gray-400">
                {countForCategory(category.slug)} student
                {countForCategory(category.slug) === 1 ? "" : "s"}
              </p>
            </Link>
          ))}

          {ungroupedCount > 0 && (
            <Link
              href={`/dashboard/admin/students/branch/${encodeURIComponent(
                branch
              )}/${UNGROUPED_CATEGORY.slug}`}
              className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <FolderIcon className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-semibold text-gray-800 text-center">
                {UNGROUPED_CATEGORY.label}
              </p>
              <p className="text-xs text-gray-400">
                {ungroupedCount} student{ungroupedCount === 1 ? "" : "s"}
              </p>
            </Link>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}
