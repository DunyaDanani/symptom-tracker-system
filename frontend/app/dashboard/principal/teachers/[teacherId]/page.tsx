"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";
interface TeacherProfileData {
  _id: string;
  name: string;
  username: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  age: number | null;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
}

export default function PrincipalTeacherProfilePage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = use(params);

  const [teacher, setTeacher] = useState<TeacherProfileData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/principal/teachers/${teacherId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setTeacher(data.teacher);
          setStudents(data.students);
        } else {
          setError(data.message || "Could not load teacher profile");
        }
      } catch (err) {
        console.error("Failed to load teacher profile", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teacherId]);

  return (
    <PrincipalDashboardLayout>
      <BackButton />

      {loading ? (
        <p className="text-gray-400 text-sm mt-2">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      ) : teacher ? (
        <>
          <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
            {teacher.name}
          </h1>
          <p className="text-sm text-gray-500 mb-8">Shadow Teacher</p>

          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Profile
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <ProfileRow label="Username" value={teacher.username} />
              <ProfileRow
                label="Age"
                value={teacher.age ? String(teacher.age) : "—"}
              />
              <ProfileRow
                label="Qualification"
                value={teacher.qualification || "—"}
              />
              <ProfileRow
                label="Specialization"
                value={teacher.specialization || "—"}
              />
              <ProfileRow
                label="Experience"
                value={`${teacher.experienceYears || 0} years`}
              />
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-800 px-6 pt-6 mb-4">
              Assigned Students
            </h2>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400 px-6 pb-6">
                No students assigned here.
              </p>
            ) : (
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
                      <td className="px-6 py-3">
                        {s.grade}
                        {s.section ? ` · ${s.section}` : ""}
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
            )}
          </div>
        </>
      ) : null}
    </PrincipalDashboardLayout>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
