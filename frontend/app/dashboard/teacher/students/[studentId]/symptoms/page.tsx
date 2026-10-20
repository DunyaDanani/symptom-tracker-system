"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import SubpageHeader from "@/components/SubpageHeader";
import { API_BASE } from "@/lib/config";
import LoadingSkeleton from "@/components/Skeleton";
import { toast } from "@/lib/toast";
import { BTN_SECONDARY, BTN_DANGER_OUTLINE, BTN_SUCCESS } from "@/lib/ui";

interface StudentSummary {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
  diagnosis: string;
}

interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
  // Screen-only: true once the teacher presses "Confirm medication" (the
  // row then shows as a summary). Never sent to the server.
  confirmed?: boolean;
  nameError?: string;
}

// Symptom logging only — the "+ Log Symptom" flow. Viewing past logs
// (with editing/deleting) lives on the separate read-only History page so
// the insert form and the log list never sit on the same screen.
export default function TeacherLogSymptomsPage({
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
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

  // A row being filled in must be confirmed (or removed) before another is
  // added or the log is saved, so nothing half-typed is saved by accident.
  const hasUnconfirmed = medications.some((m) => !m.confirmed);

  const confirmMedicationRow = (index: number) => {
    setMedications((prev) =>
      prev.map((m, i) =>
        i !== index
          ? m
          : m.name.trim()
          ? { ...m, name: m.name.trim(), confirmed: true, nameError: undefined }
          : { ...m, nameError: "Medication name is required" }
      )
    );
  };

  const editMedicationRow = (index: number) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, confirmed: false } : m))
    );
  };

  const updateMedicationRow = (
    index: number,
    field: keyof MedicationEntry,
    value: string
  ) => {
    setMedications((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, [field]: value, ...(field === "name" ? { nameError: undefined } : {}) }
          : m
      )
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
    if (hasUnconfirmed) {
      setStatus("Confirm or remove the medication you're adding before saving.");
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
          medications: medications
            .filter((m) => m.confirmed && m.name.trim())
            .map(({ name, dosage, time }) => ({ name, dosage, time })),
          medicationNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("Symptom log saved.");
        toast.success("Symptom log saved");
        setSelectedSymptoms([]);
        setNotes("");
        setMedications([]);
        setMedicationNotes("");
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
    <TeacherDashboardLayout
      breadcrumbLabels={
        student
          ? { [studentId]: student.fullName }
          : undefined
      }
    >
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <SubpageHeader
            title="Log Symptoms"
            subtitle={`${student?.fullName ?? ""} · ${student?.grade ?? ""}${
              student?.section ? ` · ${student.section}` : ""
            }`}
            action={{
              href: `/dashboard/teacher/students/${studentId}/symptoms/history`,
              label: "View Full History",
              emphasis: "secondary",
            }}
          />

          {/* One log entry, one submission — but symptoms and medication are
              kept in visually separate cards so they don't read as a single
              wall of fields. Save happens once, from the bar below both. */}
          <form onSubmit={submitSymptoms}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Symptoms card */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">
                  Symptoms
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Select everything observed during this session.
                </p>

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

                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Additional notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                />
              </div>

              {/* Medication card */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Medication
                  </h2>
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    disabled={hasUnconfirmed}
                    title={hasUnconfirmed ? "Confirm the medication you're adding first" : undefined}
                    className={BTN_SECONDARY}
                  >
                    + Add medication
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Optional — only if medication was given during this session.
                </p>

                {medications.length === 0 ? (
                  <p className="text-sm text-gray-300 border border-dashed border-gray-200 rounded-md p-4 text-center">
                    No medication added
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 mb-4">
                    {medications.map((m, i) => (
                      m.confirmed ? (
                        <div
                          key={i}
                          className="border border-gray-100 rounded-md px-3 py-2 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              <span className="text-emerald-600 mr-1">✓</span>
                              {m.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {[m.dosage && `Dosage: ${m.dosage}`, m.time && `Time: ${m.time}`]
                                .filter(Boolean)
                                .join(" · ") || "No dosage or time given"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editMedicationRow(i)}
                              className={BTN_SECONDARY}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMedicationRow(i)}
                              className={BTN_DANGER_OUTLINE}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                      <div
                        key={i}
                        className="border border-blue-100 bg-blue-50/30 rounded-md p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-gray-500">
                            Medication {i + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeMedicationRow(i)}
                            className={BTN_DANGER_OUTLINE}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            updateMedicationRow(i, "name", e.target.value)
                          }
                          placeholder="Name"
                          className={`w-full text-sm border rounded-md p-2 outline-none focus:border-blue-400 ${m.nameError ? "border-red-400" : "border-gray-200"}`}
                        />
                        {m.nameError ? (
                          <p className="text-xs text-red-500 mt-1 mb-2">{m.nameError}</p>
                        ) : (
                          <div className="mb-2" />
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={m.dosage || ""}
                            onChange={(e) =>
                              updateMedicationRow(i, "dosage", e.target.value)
                            }
                            placeholder="Dosage"
                            className="text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                          />
                          <input
                            type="text"
                            value={m.time || ""}
                            onChange={(e) =>
                              updateMedicationRow(i, "time", e.target.value)
                            }
                            placeholder="Time"
                            className="text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            type="button"
                            onClick={() => confirmMedicationRow(i)}
                            className={BTN_SUCCESS}
                          >
                            ✓ Confirm medication
                          </button>
                        </div>
                      </div>
                      )
                    ))}
                  </div>
                )}

                {medications.length > 0 && (
                  <>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Medication notes
                    </label>
                    <textarea
                      value={medicationNotes}
                      onChange={(e) => setMedicationNotes(e.target.value)}
                      placeholder="Optional"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Symptom Log"}
              </button>
              {status && (
                <p className="text-xs text-gray-500">{status}</p>
              )}
            </div>
          </form>
        </>
      )}
    </TeacherDashboardLayout>
  );
}
