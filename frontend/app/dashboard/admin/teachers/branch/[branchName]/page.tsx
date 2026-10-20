"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

import { API_BASE } from "@/lib/config";
interface AssignedTeacher {
  _id: string;
  name: string;
  username: string;
}

interface Student {
  _id: string;
  branch: string;
  assignedTeacher?: AssignedTeacher | null;
  teacherHistory?: {
    teacher: AssignedTeacher | null;
    removedAt?: string | null;
  }[];
}

export default function AdminTeacherBranchPage({
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
          setError(data.message || "Could not load teachers");
        }
      } catch (err) {
        console.error("Failed to load teachers", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [branch]);

  // Current teachers in this branch, plus teachers who used to have a
  // student here — their details stay on file after the student is moved
  // away, so they can be requested again for a new child.
  const teacherMap = new Map<
    string,
    { teacher: AssignedTeacher; count: number; previous: number }
  >();
  const entryFor = (t: AssignedTeacher) => {
    let entry = teacherMap.get(t._id);
    if (!entry) {
      entry = { teacher: t, count: 0, previous: 0 };
      teacherMap.set(t._id, entry);
    }
    return entry;
  };
  students.forEach((s) => {
    if (s.assignedTeacher) entryFor(s.assignedTeacher).count += 1;
    (s.teacherHistory || []).forEach((h) => {
      if (h.removedAt && h.teacher) entryFor(h.teacher).previous += 1;
    });
  });
  const teachers = Array.from(teacherMap.values()).sort(
    (a, b) => b.count - a.count || a.teacher.name.localeCompare(b.teacher.name)
  );

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        {branch}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {teachers.length} shadow teacher{teachers.length === 1 ? "" : "s"}
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
          No shadow teachers assigned in {branch} yet.
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
                  Username
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Assigned Students
                </th>
                <th className="px-6 py-3 font-semibold text-gray-700">
                  Profile
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(({ teacher, count, previous }) => (
                <tr key={teacher._id} className="border-b border-gray-50">
                  <td className="px-6 py-3">{teacher.name}</td>
                  <td className="px-6 py-3 text-gray-500">
                    {teacher.username}
                  </td>
                  <td className="px-6 py-3">
                    {count}
                    {count === 0 && previous > 0 && (
                      <span className="ml-2 text-xs text-gray-400">
                        Previously assigned here
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/admin/teachers/branch/${encodeURIComponent(
                        branch
                      )}/${teacher._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Profile
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
