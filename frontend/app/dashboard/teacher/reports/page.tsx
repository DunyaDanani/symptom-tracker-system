"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";

interface AssignedStudent {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
}

export default function TeacherReportsListPage() {
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/teacher/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
        } else {
          setError(data.message || "Could not load your students");
        }
      } catch (err) {
        console.error("Failed to load students", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <TeacherDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Reports</h1>
      <p className="text-sm text-gray-500 -mt-6 mb-8">
        Select a student to view their symptom trend report.
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
          No students are currently assigned to you.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <Link
              key={s._id}
              href={`/dashboard/teacher/students/${s._id}/reports`}
              className="bg-white rounded-md shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-800">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Grade {s.grade}
                {s.section ? ` · ${s.section}` : ""}
              </p>
              <p className="text-xs text-gray-400 mt-2">{s.diagnosis}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">
                {s.communicationLevel.replace("-", " ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </TeacherDashboardLayout>
  );
}
