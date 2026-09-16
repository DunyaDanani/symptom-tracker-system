"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import SubpageHeader from "@/components/SubpageHeader";
import DateRangeFilter from "@/components/DateRangeFilter";
import { filterByDateRange } from "@/lib/dateRangeFilter";
import { API_BASE } from "@/lib/config";

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
}

interface SymptomLogEntry {
  _id: string;
  symptoms: string[];
  additionalNotes?: string;
  medications?: MedicationEntry[];
  medicationNotes?: string;
  createdAt: string;
  teacher?: { _id: string; name: string; role: string } | null;
  academicYear?: string;
  term?: string;
}

// A symptom log can be recorded by either a shadow teacher or an admin.
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  shadow_teacher: "Shadow Teacher",
  cao: "CAO",
  principal: "Principal",
};

function formatRecordedBy(teacher?: { name: string; role: string } | null) {
  if (!teacher?.name) return "—";
  const roleLabel = ROLE_LABELS[teacher.role] || teacher.role || "";
  return roleLabel ? `${teacher.name} (${roleLabel})` : teacher.name;
}

// Read-only symptom history — the "Symptom History" card on the student hub
// links here. Logging a new symptom is a separate flow (see
// students/[studentId]/symptoms/page.tsx) reached via the "+ Log Symptom"
// button below, so viewing history never has an insert form mixed into it.
export default function TeacherSymptomHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [history, setHistory] = useState<SymptomLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editSymptoms, setEditSymptoms] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  // The token isn't encrypted, just signed — decode the payload to read the
  // logged-in user's own id so edit/delete icons only show on entries this
  // teacher recorded themselves (the backend also enforces this).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id || null);
      } catch (err) {
        console.error("Failed to decode token", err);
      }
    }
  }, []);

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
        console.error("Failed to load symptom history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const startEdit = (log: SymptomLogEntry) => {
    setEditingLogId(log._id);
    setEditSymptoms(log.symptoms);
    setEditNotes(log.additionalNotes || "");
  };

  const toggleEditSymptom = (symptom: string) => {
    setEditSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const saveEdit = async (logId: string) => {
    if (editSymptoms.length === 0) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/symptoms/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          symptoms: editSymptoms,
          additionalNotes: editNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingLogId(null);
        await loadHistory();
      } else {
        alert(data.message || "Could not update symptom log");
      }
    } catch (err) {
      console.error("Failed to update symptom log", err);
      alert("Unable to reach the server");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm("Delete this symptom log?")) return;
    try {
      const res = await fetch(`${API_BASE}/teacher/symptoms/${logId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await loadHistory();
      } else {
        alert(data.message || "Could not delete symptom log");
      }
    } catch (err) {
      console.error("Failed to delete symptom log", err);
      alert("Unable to reach the server");
    }
  };

  const filteredHistory = filterByDateRange(
    history,
    dateFrom,
    dateTo,
    (log) => log.createdAt
  );

  return (
    <TeacherDashboardLayout
      breadcrumbLabels={
        student
          ? { [studentId]: student.fullName }
          : undefined
      }
    >
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <SubpageHeader
            title="Symptom History"
            subtitle={`${student?.fullName ?? ""} · ${student?.grade ?? ""}${
              student?.section ? ` · ${student.section}` : ""
            }`}
            action={{
              href: `/dashboard/teacher/students/${studentId}/symptoms`,
              label: "+ Log Symptom",
            }}
          />

          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <div className="p-6 pb-0">
              <DateRangeFilter
                from={dateFrom}
                to={dateTo}
                onFromChange={setDateFrom}
                onToChange={setDateTo}
                onClear={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                resultCount={filteredHistory.length}
              />
            </div>
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Symptoms
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Recorded By
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-gray-400">
                      {history.length === 0
                        ? "No symptom logs yet."
                        : "No symptom logs in this date range."}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((log) =>
                    editingLogId === log._id ? (
                      <tr key={log._id} className="border-b border-gray-50">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="flex flex-col gap-2 mb-3">
                            {symptomOptions.map((symptom) => (
                              <label
                                key={symptom}
                                className="flex items-start gap-2 text-sm text-gray-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={editSymptoms.includes(symptom)}
                                  onChange={() => toggleEditSymptom(symptom)}
                                  className="mt-0.5 rounded border-gray-300"
                                />
                                {symptom}
                              </label>
                            ))}
                          </div>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={2}
                            placeholder="Additional notes (optional)"
                            className="w-full text-sm border border-gray-200 rounded-md p-2 mb-3 outline-none focus:border-blue-400"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(log._id)}
                              disabled={savingEdit}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-60"
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLogId(null)}
                              className="text-xs text-gray-500 px-4 py-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={log._id} className="border-b border-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                          {log.academicYear && log.term && (
                            <p className="text-xs text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                              {log.academicYear} {log.term}
                            </p>
                          )}
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
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatRecordedBy(log.teacher)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {log.teacher?._id === currentUserId && (
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startEdit(log)}
                                className="text-gray-300 hover:text-blue-600 transition-colors"
                                aria-label="Edit symptom log"
                                title="Edit"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLog(log._id)}
                                className="text-gray-300 hover:text-red-600 transition-colors"
                                aria-label="Delete symptom log"
                                title="Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </TeacherDashboardLayout>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 4.5l3.75 3.75" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
