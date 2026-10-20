"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

import { API_BASE } from "@/lib/config";
import ProfileBanner, { BANNER_ACTION_CLASSES } from "@/components/ProfileBanner";
import ProfileDetailsModal from "@/components/ProfileDetailsModal";
import LoadingSkeleton from "@/components/Skeleton";
import { toast } from "@/lib/toast";
import { formatText } from "@/lib/format";
interface TeacherProfileData {
  _id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  qualification: string;
  specialization: string;
  experienceYears: number;
  age: number | null;
  nic?: string;
}

interface Student {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
  branch: string;
  assignedTeacher?: { _id: string } | null;
  teacherHistory?: {
    teacher: { _id: string } | null;
    assignedAt?: string;
    removedAt?: string | null;
  }[];
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
  const [previousStudents, setPreviousStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState("");
  const [editNic, setEditNic] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showProfile, setShowProfile] = useState(false);

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
            setEditPhone(found.phone || "");
            setEditAge(found.age ? String(found.age) : "");
            setEditQualification(found.qualification || "");
            setEditSpecialization(found.specialization || "");
            setEditExperienceYears(
              found.experienceYears ? String(found.experienceYears) : ""
            );
            setEditNic(found.nic || "");
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
          setPreviousStudents(
            studentsData.students.filter(
              (s: Student) =>
                s.branch === branch &&
                (s.teacherHistory || []).some(
                  (h) => h.removedAt && h.teacher?._id === teacherId
                )
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
          phone: editPhone.trim(),
          age: editAge,
          qualification: editQualification,
          specialization: editSpecialization,
          experienceYears: editExperienceYears,
          nic: editNic.trim(),
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
      toast.success("Teacher profile saved");
    } catch (err) {
      console.error("Failed to update teacher", err);
      setSaveError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbLabels={teacher ? { [teacherId]: teacher.name } : undefined}
    >
      {loading ? (
        <LoadingSkeleton className="mt-2" />
      ) : error ? (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      ) : teacher ? (
        <>
          <ProfileBanner
            className="mt-2 mb-6"
            name={teacher.name}
            lines={[
              { label: "Role", value: `Shadow Teacher · ${branch}` },
              { label: "Username", value: teacher.username },
              { label: "Specialization", value: formatText(teacher.specialization) },
              {
                label: "Experience",
                value: `${teacher.experienceYears || 0} years`,
              },
              {
                label: "Students",
                value: `${students.length} current${
                  previousStudents.length ? ` · ${previousStudents.length} previous` : ""
                }`,
              },
            ]}
            actions={
              !editing ? (
                <>
                  <button
                    onClick={() => setShowProfile(true)}
                    className={BANNER_ACTION_CLASSES}
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className={BANNER_ACTION_CLASSES}
                  >
                    Edit profile
                  </button>
                </>
              ) : null
            }
          />

          <ProfileDetailsModal
            open={showProfile}
            onClose={() => setShowProfile(false)}
            title="Shadow Teacher Profile"
            sections={[
              {
                rows: [
                  { label: "Name", value: teacher.name, wide: true },
                  { label: "Username", value: teacher.username },
                  { label: "Branch", value: branch },
                  { label: "Email", value: teacher.email },
                  { label: "Phone", value: teacher.phone },
                  { label: "NIC", value: teacher.nic },
                  { label: "Age", value: teacher.age },
                  { label: "Highest Qualification", value: formatText(teacher.qualification) },
                  { label: "Specialization", value: formatText(teacher.specialization) },
                  {
                    label: "Experience",
                    value: `${teacher.experienceYears || 0} years`,
                  },
                ],
              },
            ]}
          />

          {editing && (
          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Edit Profile
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
                  <EditField label="Phone Number">
                    <input
                      type="tel"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 0771234567"
                    />
                  </EditField>
                  <EditField label="NIC">
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editNic}
                      onChange={(e) => setEditNic(e.target.value)}
                      placeholder="e.g. 199012345678 or 901234567V"
                    />
                  </EditField>
                  <EditField label="Age">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
                      value={editAge}
                      onChange={(e) =>
                        setEditAge(e.target.value.replace(/[^0-9]/g, ""))
                      }
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
                  <EditField label="Highest Qualification">
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
                      setEditPhone(teacher.phone || "");
                      setEditAge(teacher.age ? String(teacher.age) : "");
                      setEditQualification(teacher.qualification || "");
                      setEditSpecialization(teacher.specialization || "");
                      setEditExperienceYears(
                        teacher.experienceYears
                          ? String(teacher.experienceYears)
                          : ""
                      );
                      setEditNic(teacher.nic || "");
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          )}

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
                      <td className="px-6 py-3">{s.fullName}</td>
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

          {previousStudents.length > 0 && (
            <div className="bg-white rounded-md shadow-sm overflow-hidden mt-6">
              <h2 className="text-sm font-semibold text-gray-800 px-6 pt-6 mb-4">
                Previous Students in {branch}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Grade</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Until</th>
                  </tr>
                </thead>
                <tbody>
                  {previousStudents.map((s) => {
                    const removedAt = (s.teacherHistory || [])
                      .filter((h) => h.removedAt && h.teacher?._id === teacherId)
                      .map((h) => h.removedAt as string)
                      .sort()
                      .pop();
                    return (
                      <tr key={s._id} className="border-b border-gray-50">
                        <td className="px-6 py-3">{s.fullName}</td>
                        <td className="px-6 py-3">
                          {s.grade}
                          {s.section ? ` · ${s.section}` : ""}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {removedAt ? new Date(removedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </DashboardLayout>
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
