"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import { API_BASE } from "@/lib/config";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  communicationLevel: string;
  diagnosis: string;
  flagged?: boolean;
  assignedTeacher?: { name: string } | null;
  parentUser?: { name: string } | null;
}

export default function PrincipalStudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<Student | null>(null);
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
          const found = data.students.find(
            (s: Student) => s._id === studentId
          );
          if (found) {
            setStudent(found);
          } else {
            setError("This student could not be found");
          }
        } else {
          setError(data.message || "Could not load student profile");
        }
      } catch (err) {
        console.error("Failed to load student profile", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [studentId]);

  return (
    <PrincipalDashboardLayout>
      <BackButton />

      {loading ? (
        <p className="text-gray-400 text-sm mt-2">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      ) : student ? (
        <>
          <div className="flex items-center gap-4 mt-2 mb-6">
            <Avatar
              name={`${student.firstName} ${student.lastName}`}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-blue-900">
                  {student.firstName} {student.lastName}
                </h1>
                {student.flagged && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    Flagged
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {student.grade}
                {student.section ? ` · ${student.section}` : ""} ·{" "}
                {student.diagnosis}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Profile
              </h2>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <Row label="Grade" value={student.grade} />
                {student.section && (
                  <Row label="Section" value={student.section} />
                )}
                <Row label="Diagnosis" value={student.diagnosis} />
                <Row label="Communication" value={student.communicationLevel} />
                <Row
                  label="Shadow Teacher"
                  value={student.assignedTeacher?.name || "Unassigned"}
                />
                <Row
                  label="Parent/Guardian"
                  value={student.parentUser?.name || "—"}
                />
              </dl>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
              <Link
                href={`/dashboard/principal/students/${studentId}/history`}
                className="bg-white rounded-md shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <p className="font-semibold text-gray-800">History</p>
                <p className="text-sm text-gray-500 mt-1">
                  Symptom and emotion check-in history
                </p>
              </Link>

              <Link
                href={`/dashboard/principal/students/${studentId}/reports`}
                className="bg-white rounded-md shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <p className="font-semibold text-gray-800">Reports</p>
                <p className="text-sm text-gray-500 mt-1">
                  View the symptom trend report
                </p>
              </Link>

              <Link
                href={`/dashboard/principal/students/${studentId}/doctor-documents`}
                className="bg-white rounded-md shadow-sm p-5 hover:shadow-md transition-shadow"
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
        </>
      ) : null}
    </PrincipalDashboardLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}
