"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";
interface TeacherProfileData {
  _id: string;
  name: string;
  username: string;
  email?: string | null;
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
  branch: string;
  assignedTeacher?: { _id: string } | null;
}

export default function AdminTeacherProfilePage({
  params,
}: {
  params: Promise<{ branchName: string; teacherId: string }>;
}) {
  const { branchName, teacherId } = use(params);
  const branch = decodeURIComponent(branchName);

  const [teacher, setTeacher] = useState<TeacherProfileData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const [teachersRes, studentsRes] = await Promise.all([
          fetch(`${API_BASE}/students/teachers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const teachersData = await teachersRes.json();
        const studentsData = await studentsRes.json();

        if (teachersData.success) {
          const found = teachersData.teachers.find(
            (t: TeacherProfileData) => t._id === teacherId
          );
          if (found) {
            setTeacher(found);
            setEditName(found.name);
            setEditEmail(found.email || "");
            setEditAge(found.age ? String(found.age) : "");
            setEditQualification(found.qualification || "");
            setEditSpecialization(found.specialization || "");
            setEditExperienceYears(
              found.experienceYears ? String(found.experienceYears) : ""
            );
          } else setError("Teacher not found");
        } else {
          setError(teachersData.message || "Could not load teacher");
        }

        if (studentsData.success) {
          setStudents(
            studentsData.students.filter(
              (s: Student) =>
                s.branch === branch && s.assignedTeacher?._id === teacherId
            )
          );
        }
      } catch (err) {
        console.error("Failed to load teacher profile", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [branch, teacherId]);

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/students/teachers/${teacherId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail.trim(),
          age: editAge,
          qualification: editQualification,
          specialization: editSpecialization,
          experienceYears: editExperienceYears,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setSaveError(data.message || "Failed to update teacher");
        setSaving(false);
        return;
      }
      setTeacher((prev) => (prev ? { ...prev, ...data.teacher } : data.teacher));
      setEditing(false);
    } catch (err) {
      console.error("Failed to update teacher", err);
      setSaveError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <BackButton />

      {loading ? (
        <p className="text-gray-400 text-sm mt-2">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      ) : teacher ? (
        <>
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-semibold text-blue-900 mt-2">
              {teacher.name}
            </h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="mt-2 border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded hover:bg-gray-50"
              >
                Edit profile
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-8">
            Shadow Teacher · {branch}
          </p>

          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Profile
            </h2>

            {editing ? (
              <div className="space-y-4">
                {saveError && (
                  <p className="text-sm text-red-500">{saveError}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Name">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </EditField>
                  <EditField label="Email">
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="teacher@example.com"
                    />
                  </EditField>
                  <EditField label="Age">
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                    />
                  </EditField>
                  <EditField label="Experience (years)">
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editExperienceYears}
                      onChange={(e) => setEditExperienceYears(e.target.value)}
                    />
                  </EditField>
                  <EditField label="Qualification">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editQualification}
                      onChange={(e) => setEditQualification(e.target.value)}
                    />
                  </EditField>
                  <EditField label="Specialization">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                    />
                  </EditField>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setSaveError("");
                      setEditName(teacher.name);
                      setEditEmail(teacher.email || "");
                      setEditAge(teacher.age ? String(teacher.age) : "");
                      setEditQualification(teacher.qualification || "");
                      setEditSpecialization(teacher.specialization || "");
                      setEditExperienceYears(
                        teacher.experienceYears
                          ? String(teacher.experienceYears)
                          : ""
                      );
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ProfileRow label="Username" value={teacher.username} />
                <ProfileRow label="Email" value={teacher.email || "—"} />
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
            )}
          </div>

          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-800 px-6 pt-6 mb-4">
              Assigned Students in {branch}
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
            )}
          </div>
        </>
      ) : null}
    </DashboardLayout>
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

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
