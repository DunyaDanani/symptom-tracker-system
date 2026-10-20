"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import SymptomTrendChart from "@/components/SymptomTrendChart";
import { TERMS, useAcademicTerms } from "@/lib/academicTerms";

import { API_BASE } from "@/lib/config";
import BackButton from "@/components/BackButton";
import { formatCommunication, formatText } from "@/lib/format";
import { tabClass, SELECT_CLASS, BTN_SUCCESS } from "@/lib/ui";
import { InlineSkeleton } from "@/components/Skeleton";

interface StudentProfile {
  _id: string;
  admissionNumber?: string;
  fullName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
  branch: string;
  assignedTeacher?: { name: string } | null;
  parentUser?: { name: string } | null;
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
  teacher?: { name: string; role: string } | null;
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

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
  academicYear?: string;
  term?: string;
}

const EMOJI_ICON: Record<string, string> = {
  very_sad: "😢 Very sad",
  sad: "🙁 Sad",
  neutral: "😐 Neutral",
  happy: "🙂 Happy",
  very_happy: "😄 Very happy",
};

const RANGE_DAYS: Record<"weekly" | "monthly" | "quarterly", number> = {
  weekly: 7,
  monthly: 35,
  quarterly: 92,
};

// Report range options for the toolbar. Short labels keep the tabs on one
// line; the hint explains what each covers.
const RANGE_TABS: {
  value: "weekly" | "monthly" | "quarterly" | "term";
  label: string;
  hint: string;
}[] = [
  { value: "weekly", label: "Weekly", hint: "Last 7 days" },
  { value: "monthly", label: "Monthly", hint: "Last 5 weeks" },
  { value: "quarterly", label: "3-Month Conclusion", hint: "Last 3 months — final conclusion report" },
  { value: "term", label: "By Term", hint: "One academic term:" },
];

export default function PrintReportPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [range, setRange] = useState<
    "weekly" | "monthly" | "quarterly" | "term"
  >("weekly");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [trend, setTrend] = useState<{ label: string; count: number }[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [emotionCheckins, setEmotionCheckins] = useState<
    EmotionCheckinEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");
  const [termAcademicYear, setTermAcademicYear] = useState("");
  const [termTerm, setTermTerm] = useState("");

  const { terms: academicTerms, academicYears, currentTerm } =
    useAcademicTerms(studentId);

  const selectedTermEntry = academicTerms.find(
    (t) => t.academicYear === termAcademicYear && t.term === termTerm
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load / sync from browser storage or loaded data
    setGeneratedBy(localStorage.getItem("name") || "");

    // Pick up an initial ?range= (and, for "term", ?academicYear=/?term=)
    // from the linking page (e.g. Reports), so the printout defaults to
    // whatever range the user was viewing.
    const params = new URLSearchParams(window.location.search);
    const initialRange = params.get("range");
    if (
      initialRange === "monthly" ||
      initialRange === "weekly" ||
      initialRange === "quarterly" ||
      initialRange === "term"
    ) {
      setRange(initialRange);
    }
    const initialAcademicYear = params.get("academicYear");
    const initialTerm = params.get("term");
    if (initialAcademicYear) setTermAcademicYear(initialAcademicYear);
    if (initialTerm) setTermTerm(initialTerm);
  }, []);

  useEffect(() => {
    if (termAcademicYear || termTerm) return;
    if (!currentTerm) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load / sync from browser storage or loaded data
    setTermAcademicYear(currentTerm.academicYear);
    setTermTerm(currentTerm.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTerm]);

  useEffect(() => {
    if (range === "term" && (!termAcademicYear || !termTerm)) return;

    const load = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const trendQuery =
          range === "term"
            ? `range=term&academicYear=${encodeURIComponent(
                termAcademicYear
              )}&term=${encodeURIComponent(termTerm)}`
            : `range=${range}`;

        const [profileRes, historyRes, trendRes] = await Promise.all([
          fetch(`${API_BASE}/students/${studentId}/profile`, { headers }),
          fetch(`${API_BASE}/students/${studentId}/history`, { headers }),
          fetch(
            `${API_BASE}/students/${studentId}/symptom-trends?${trendQuery}`,
            { headers }
          ),
        ]);

        const profileData = await profileRes.json();
        const historyData = await historyRes.json();
        const trendData = await trendRes.json();

        if (!profileData.success) {
          setError(profileData.message || "Could not load student profile");
          return;
        }
        setStudent(profileData.student);

        if (historyData.success) {
          let windowStart: Date;
          let windowEnd: Date | null = null;

          if (range === "term") {
            if (!selectedTermEntry) {
              setSymptomLogs([]);
              setEmotionCheckins([]);
              if (trendData.success) setTrend(trendData.trend);
              return;
            }
            windowStart = new Date(selectedTermEntry.startDate);
            windowEnd = new Date(selectedTermEntry.endDate);
          } else {
            windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - RANGE_DAYS[range]);
          }

          setSymptomLogs(
            historyData.symptomLogs.filter((l: SymptomLogEntry) => {
              const created = new Date(l.createdAt);
              return (
                created >= windowStart && (!windowEnd || created <= windowEnd)
              );
            })
          );
          setEmotionCheckins(
            historyData.emotionCheckins.filter((c: EmotionCheckinEntry) => {
              const created = new Date(c.createdAt);
              return (
                created >= windowStart && (!windowEnd || created <= windowEnd)
              );
            })
          );
        }

        if (trendData.success) {
          setTrend(trendData.trend);
        }
      } catch (err) {
        console.error("Failed to load report data", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [studentId, range, termAcademicYear, termTerm, selectedTermEntry]);

  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Screen-only controls */}
      <div className="max-w-3xl mx-auto mb-4 print:hidden">
        <BackButton />
      </div>
      <div className="max-w-3xl mx-auto mb-6 print:hidden space-y-3">
        {/* Row 1: report range tabs + print action */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Report range">
            {RANGE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={range === tab.value}
                onClick={() => setRange(tab.value)}
                title={tab.hint}
                className={tabClass(range === tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !!error}
            className={BTN_SUCCESS}
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Row 2: what the selected range covers, plus term pickers */}
        <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
          <span>{RANGE_TABS.find((t) => t.value === range)?.hint}</span>
          {range === "term" && (
            <>
              <select
                value={termAcademicYear}
                onChange={(e) => setTermAcademicYear(e.target.value)}
                aria-label="Academic year"
                className={SELECT_CLASS}
              >
                <option value="">Academic Year</option>
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={termTerm}
                onChange={(e) => setTermTerm(e.target.value)}
                aria-label="Term"
                className={SELECT_CLASS}
              >
                <option value="">Term</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Printable sheet */}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-md print:rounded-none p-8">
        {loading ? (
          <InlineSkeleton rows={6} />
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : (
          <>
            {/* Report header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6 break-inside-avoid">
              <div className="flex items-center gap-3">
                <Image
                  src="/12.jpg"
                  alt="OKI International School"
                  width={44}
                  height={44}
                  className="object-contain"
                />
                <div>
                  <p className="text-blue-900 font-bold leading-tight">
                    OKI International School
                  </p>
                  <p className="text-xs text-gray-400">
                    {student?.branch} Branch
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">
                  {range === "quarterly"
                    ? "3-Month Final Conclusion Report"
                    : range === "term"
                      ? `${
                          termAcademicYear && termTerm
                            ? `${termAcademicYear} ${termTerm}`
                            : "Term"
                        } Conclusion Report`
                      : "Symptom & Emotion Report"}
                </p>
                <p className="text-xs text-gray-400">
                  Generated {generatedAt.toLocaleDateString()} by{" "}
                  {generatedBy || "—"}
                </p>
              </div>
            </div>

            {/* Student info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6 break-inside-avoid">
              <InfoRow
                label="Student Name"
                value={student?.fullName || ""}
              />
              <InfoRow
                label="Admission No."
                value={student?.admissionNumber || "—"}
              />
              <InfoRow
                label="Grade"
                value={`${student?.grade}${
                  student?.section ? " · " + student.section : ""
                }`}
              />
              <InfoRow label="Diagnosis" value={formatText(student?.diagnosis) || "—"} />
              <InfoRow
                label="Communication Level"
                value={formatCommunication(student?.communicationLevel) || "—"}
              />
              <InfoRow
                label="Shadow Teacher"
                value={student?.assignedTeacher?.name || "Unassigned"}
              />
              <InfoRow
                label="Parent / Guardian"
                value={student?.parentUser?.name || "—"}
              />
              <InfoRow
                label="Report Period"
                value={
                  range === "weekly"
                    ? "Last 7 Days"
                    : range === "monthly"
                    ? "Last 5 Weeks (35 Days)"
                    : range === "quarterly"
                    ? "3-Month Final Conclusion (Last 92 Days)"
                    : termAcademicYear && termTerm
                    ? `${termAcademicYear} ${termTerm}`
                    : "—"
                }
              />
            </div>

            {/* Trend chart */}
            <div className="mb-6 break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-3">
                Symptom Trend
              </h2>
              <SymptomTrendChart data={trend} />
            </div>

            {/* Symptom logs */}
            <div className="mb-6 break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-3">
                Symptom Logs ({symptomLogs.length})
              </h2>
              {symptomLogs.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No symptom logs recorded in this period.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                        Date
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                        Term
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Symptoms Observed
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Medication
                      </th>
                      <th className="py-1.5 font-semibold text-gray-600 whitespace-nowrap">
                        Recorded By
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomLogs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-600">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-600">
                          {log.academicYear && log.term
                            ? `${log.academicYear} ${log.term}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-3 align-top text-gray-800">
                          {log.symptoms.join("; ")}
                          {log.additionalNotes && (
                            <p className="text-gray-400 mt-0.5">
                              Note: {log.additionalNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top text-gray-800">
                          {log.medications && log.medications.length > 0
                            ? log.medications
                                .map(
                                  (m) =>
                                    `${m.name}${m.dosage ? ` (${m.dosage})` : ""}`
                                )
                                .join("; ")
                            : "—"}
                          {log.medicationNotes && (
                            <p className="text-gray-400 mt-0.5">
                              {log.medicationNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-2 align-top text-gray-600 whitespace-nowrap">
                          {formatRecordedBy(log.teacher)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Emotion check-ins */}
            <div className="mb-6 break-inside-avoid">
              <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-3">
                Emotion Check-ins ({emotionCheckins.length})
              </h2>
              {emotionCheckins.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No emotion check-ins recorded in this period.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                        Date
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600 whitespace-nowrap">
                        Term
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Child
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Teacher
                      </th>
                      <th className="py-1.5 font-semibold text-gray-600">
                        Score (1 = very sad, 5 = very happy)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emotionCheckins.map((c) => (
                      <tr key={c._id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                          {c.academicYear && c.term
                            ? `${c.academicYear} ${c.term}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-800">
                          {c.childEmoji ? EMOJI_ICON[c.childEmoji] : "Not yet"}
                        </td>
                        <td className="py-2 pr-3 text-gray-800">
                          {c.teacherEmoji
                            ? EMOJI_ICON[c.teacherEmoji]
                            : "Not yet"}
                        </td>
                        <td className="py-2 text-gray-800">
                          {c.compositeScore} / 5
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Doctor's notes area */}
            <div className="break-inside-avoid pt-4">
              <h2 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                Doctor&apos;s Notes
              </h2>
              <div className="h-20 border border-dashed border-gray-300 rounded-md" />
              <div className="flex justify-between mt-6 text-xs text-gray-400">
                <span>Doctor&apos;s Signature: ______________________</span>
                <span>Date: ______________________</span>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 min-w-[9rem]">{label}:</span>
      <span className="text-gray-800 font-medium capitalize">{value}</span>
    </div>
  );
}
