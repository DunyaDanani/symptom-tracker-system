"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";

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
}

const API_BASE = "http://localhost:5000/api";

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
          <h1 className="text-2xl font-semibold text-blue-900 mb-1">
            {student?.firstName} {student?.lastName}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Grade {student?.grade}
            {student?.section ? ` · ${student.section}` : ""} ·{" "}
            {student?.diagnosis}
          </p>

          <div className="bg-white rounded-md shadow-sm p-6 mb-6 max-w-2xl">
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
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-md p-2 mb-3 outline-none focus:border-blue-400"
            />
            <button
              onClick={toggleFlag}
              disabled={savingFlag}
              className={`text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60 ${
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Link
              href={`/dashboard/teacher/students/${studentId}/symptoms`}
              className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-800">Symptom Tracking</p>
              <p className="text-sm text-gray-500 mt-1">
                Log symptoms and view history
              </p>
            </Link>

            <Link
              href={`/dashboard/teacher/students/${studentId}/emotion`}
              className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-800">Emotion Tracker</p>
              <p className="text-sm text-gray-500 mt-1">
                Record an emotion check-in and view history
              </p>
            </Link>
          </div>
        </>
      )}
    </TeacherDashboardLayout>
  );
}
