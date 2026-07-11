"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";

interface StudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
  diagnosis: string;
}

interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
}

interface SymptomLogEntry {
  _id: string;
  symptoms: string[];
  additionalNotes?: string;
  medications?: MedicationEntry[];
  medicationNotes?: string;
  createdAt: string;
}

export default function TeacherSymptomTrackingPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [medicationNotes, setMedicationNotes] = useState("");
  const [history, setHistory] = useState<SymptomLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const loadHistory = async () => {
    const res = await fetch(
      `${API_BASE}/teacher/students/${studentId}/symptoms`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) setHistory(data.logs);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsRes, optionsRes] = await Promise.all([
          fetch(`${API_BASE}/teacher/students`, { headers: authHeaders() }),
          fetch(`${API_BASE}/teacher/symptom-options`, {
            headers: authHeaders(),
          }),
        ]);

        const studentsData = await studentsRes.json();
        const optionsData = await optionsRes.json();

        if (studentsData.success) {
          const found = studentsData.students.find(
            (s: StudentSummary) => s._id === studentId
          );
          if (!found) {
            setError("This student is not assigned to you");
          } else {
            setStudent(found);
          }
        }

        if (optionsData.success) {
          setSymptomOptions(optionsData.options);
        }

        await loadHistory();
      } catch (err) {
        console.error("Failed to load symptom tracking data", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const addMedicationRow = () => {
    setMedications((prev) => [...prev, { name: "", dosage: "", time: "" }]);
  };

  const updateMedicationRow = (
    index: number,
    field: keyof MedicationEntry,
    value: string
  ) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMedicationRow = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const submitSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");

    if (selectedSymptoms.length === 0) {
      setStatus("Select at least one symptom.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/symptoms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          studentId,
          symptoms: selectedSymptoms,
          additionalNotes: notes,
          medications: medications.filter((m) => m.name.trim()),
          medicationNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("Symptom log saved.");
        setSelectedSymptoms([]);
        setNotes("");
        setMedications([]);
        setMedicationNotes("");
        await loadHistory();
      } else {
        setStatus(data.message || "Could not save symptom log.");
      }
    } catch (err) {
      console.error("Failed to submit symptoms", err);
      setStatus("Unable to reach the server.");
    } finally {
      setSaving(false);
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

          <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
            Symptom Tracking
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {student?.firstName} {student?.lastName} · Grade {student?.grade}
            {student?.section ? ` · ${student.section}` : ""}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Symptom logging form */}
            <form
              onSubmit={submitSymptoms}
              className="bg-white rounded-md shadow-sm p-6"
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Log Symptoms
              </h2>

              <div className="flex flex-col gap-2 mb-4">
                {symptomOptions.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(symptom)}
                      onChange={() => toggleSymptom(symptom)}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    {symptom}
                  </label>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-md p-2 mb-4 outline-none focus:border-blue-400"
              />

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">
                    Medication given (optional)
                  </p>
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add medication
                  </button>
                </div>
                {medications.map((m, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) =>
                        updateMedicationRow(i, "name", e.target.value)
                      }
                      placeholder="Name"
                      className="flex-1 text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                    />
                    <input
                      type="text"
                      value={m.dosage || ""}
                      onChange={(e) =>
                        updateMedicationRow(i, "dosage", e.target.value)
                      }
                      placeholder="Dosage"
                      className="w-24 text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                    />
                    <input
                      type="text"
                      value={m.time || ""}
                      onChange={(e) =>
                        updateMedicationRow(i, "time", e.target.value)
                      }
                      placeholder="Time"
                      className="w-20 text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedicationRow(i)}
                      className="text-xs text-red-500 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {medications.length > 0 && (
                  <textarea
                    value={medicationNotes}
                    onChange={(e) => setMedicationNotes(e.target.value)}
                    placeholder="Medication notes (optional)"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-md p-2 mt-1 outline-none focus:border-blue-400"
                  />
                )}
              </div>

              {status && (
                <p className="text-xs text-gray-500 mb-3">{status}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Symptom Log"}
              </button>
            </form>

            {/* Symptom history */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
                History
              </h2>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700">
                      Symptoms
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-gray-400">
                        No symptom logs yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((log) => (
                      <tr key={log._id} className="border-b border-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {log.symptoms.join(", ")}
                          {log.additionalNotes && (
                            <p className="text-xs text-gray-400 mt-1">
                              {log.additionalNotes}
                            </p>
                          )}
                          {log.medications && log.medications.length > 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1 inline-block">
                              💊{" "}
                              {log.medications
                                .map(
                                  (m) =>
                                    `${m.name}${m.dosage ? ` (${m.dosage})` : ""}`
                                )
                                .join(", ")}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </TeacherDashboardLayout>
  );
}
