"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";
interface Student {
  _id: string;
  branch: string;
}

export default function AdminBranchesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const [studentsRes, branchesRes] = await Promise.all([
          fetch(`${API_BASE}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/students/branches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const studentsData = await studentsRes.json();
        const branchesData = await branchesRes.json();

        if (studentsData.success) setStudents(studentsData.students);
        else setError(studentsData.message || "Could not load students");

        if (branchesData.success) setBranches(branchesData.branches);
      } catch (err) {
        console.error("Failed to load branches", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const countFor = (branch: string) =>
    students.filter((s) => s.branch === branch).length;

  return (
    <DashboardLayout>
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">Branches</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {branches.map((branch) => (
            <Link
              key={branch}
              href={`/dashboard/admin/students/branch/${encodeURIComponent(
                branch
              )}`}
              className="bg-white rounded-md shadow-sm p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <FolderIcon className="w-12 h-12 text-blue-400" />
              <p className="text-sm font-semibold text-gray-800 text-center">
                {branch}
              </p>
              <p className="text-xs text-gray-400">
                {countFor(branch)} student{countFor(branch) === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
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
