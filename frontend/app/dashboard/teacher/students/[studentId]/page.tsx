"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import { API_BASE } from "@/lib/config";

interface StudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
  flagged?: boolean;
  flagNote?: string;
  admissionNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  parentFirstName?: string;
  parentRelationship?: string;
  parentPhone?: string;
  parentEmail?: string;
  homeCity?: string;
}

export default function TeacherStudentHubPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [savingFlag, setSavingFlag] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/teacher/students`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const found = data.students.find(
          (s: StudentSummary) => s._id === studentId
        );
        if (!found) {
          setError("This student is not assigned to you");
        } else {
          setStudent(found);
          setFlagNote(found.flagNote || "");
        }
      } else {
        setError(data.message || "Could not load this student");
      }
    } catch (err) {
      console.error("Failed to load student", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const toggleFlag = async () => {
    if (!student) return;
    setSavingFlag(true);
    try {
      const res = await fetch(
        `${API_BASE}/teacher/students/${studentId}/flag`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            flagged: !student.flagged,
            flagNote,
          }),
        }
      );
      const data = await res.json();
      if (data.success) await load();
    } catch (err) {
      console.error("Failed to update flag", err);
    } finally {
      setSavingFlag(false);
    }
  };

  return (
    <TeacherDashboardLayout>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <BackButton />

          <div className="flex items-center gap-4 mt-2 mb-6">
            <Avatar
              name={`${student?.firstName || ""} ${student?.lastName || ""}`}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-blue-900">
                  {student?.firstName} {student?.lastName}
                </h1>
                {student?.flagged && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    Flagged
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {student?.grade}
                {student?.section ? ` · ${student.section}` : ""} ·{" "}
                {student?.diagnosis}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Profile
                </h2>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <ProfileRow
                    label="Admission No."
                    value={student?.admissionNumber || "—"}
                  />
                  <ProfileRow
                    label="Date of Birth"
                    value={
                      student?.dateOfBirth
                        ? new Date(student.dateOfBirth).toLocaleDateString()
                        : "—"
                    }
                  />
                  <ProfileRow
                    label="Gender"
                    value={student?.gender || "—"}
                    capitalize
                  />
                  <ProfileRow
                    label="Communication"
                    value={student?.communicationLevel?.replace("-", " ") || "—"}
                    capitalize
                  />
                  <ProfileRow
                    label="Parent/Guardian"
                    value={student?.parentFirstName || "—"}
                  />
                  <ProfileRow
                    label="Relationship"
                    value={student?.parentRelationship || "—"}
                  />
                  <ProfileRow
                    label="Parent Phone"
                    value={student?.parentPhone || "—"}
                  />
                  <ProfileRow
                    label="Parent Email"
                    value={student?.parentEmail || "—"}
                  />
                  <ProfileRow
                    label="Address"
                    value={student?.homeCity || "—"}
                  />
                </dl>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href={`/dashboard/teacher/students/${studentId}/symptoms`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">Symptom History</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View logged symptoms over time
                  </p>
                </Link>

                <Link
                  href={`/dashboard/teacher/students/${studentId}/emotion`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">Emotion History</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View emotion check-ins over time
                  </p>
                </Link>

                <Link
                  href={`/dashboard/teacher/students/${studentId}/doctor-documents`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">
                    Doctor&apos;s Recommendation
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    View uploaded documents and review status
                  </p>
                </Link>
              </div>
            </div>

            {/* Sidebar column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-md shadow-sm p-6 lg:sticky lg:top-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Needs Attention Flag
                  </p>
                  {student?.flagged && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                      Flagged
                    </span>
                  )}
                </div>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Optional note for the principal (e.g. reason for concern)"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 mb-3 outline-none focus:border-blue-400"
                />
                <button
                  onClick={toggleFlag}
                  disabled={savingFlag}
                  className={`w-full text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60 ${
                    student?.flagged
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {savingFlag
                    ? "Saving..."
                    : student?.flagged
                    ? "Clear Flag"
                    : "Flag for Attention"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </TeacherDashboardLayout>
  );
}

function ProfileRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-gray-800 font-medium ${capitalize ? "capitalize" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
