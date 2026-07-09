"use client";

import { useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  communicationLevel: string;
  diagnosis: string;
  assignedTeacher?: { name: string } | null;
  parentUser?: { name: string } | null;
}

export default function PrincipalChildProfilePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/principal/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStudents(data.students);
          if (data.students.length > 0) setSelectedId(data.students[0]._id);
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
  }, []);

  const selected = students.find((s) => s._id === selectedId) || null;

  return (
    <PrincipalDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">
        Child Profile
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : students.length === 0 ? (
        <p className="text-gray-400 text-sm">No students registered yet.</p>
      ) : (
        <div className="max-w-xl">
          <label className="block text-sm text-gray-600 mb-2">
            Select a student
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full mb-6 text-sm border border-gray-200 rounded-md p-2.5 bg-white outline-none focus:border-blue-400"
          >
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName} — Grade {s.grade}
              </option>
            ))}
          </select>

          {selected && (
            <div className="bg-white rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                My Info
              </h2>
              <dl className="space-y-3 text-sm">
                <Row
                  label="Name"
                  value={`${selected.firstName} ${selected.lastName}`}
                />
                <Row label="Grade" value={selected.grade} />
                {selected.section && (
                  <Row label="Section" value={selected.section} />
                )}
                <Row label="Diagnosis" value={selected.diagnosis} />
                <Row
                  label="Communication"
                  value={selected.communicationLevel}
                />
                <Row
                  label="Shadow Teacher"
                  value={selected.assignedTeacher?.name || "Unassigned"}
                />
                <Row
                  label="Parent/Guardian"
                  value={selected.parentUser?.name || "—"}
                />
              </dl>
            </div>
          )}
        </div>
      )}
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
