"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import SymptomTrendChart from "@/components/SymptomTrendChart";

import { API_BASE } from "@/lib/config";

interface StudentProfile {
  _id: string;
  firstName: string;
  lastName: string;
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
}

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
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

export default function PrintReportPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [range, setRange] = useState<"weekly" | "monthly" | "quarterly">(
    "weekly"
  );
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [trend, setTrend] = useState<{ label: string; count: number }[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [emotionCheckins, setEmotionCheckins] = useState<
    EmotionCheckinEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");

  useEffect(() => {
    setGeneratedBy(localStorage.getItem("name") || "");

    // Pick up an initial ?range= from the linking page (e.g. Reports),
    // so the printout defaults to whatever range the user was viewing.
    const initialRange = new URLSearchParams(window.location.search).get(
      "range"
    );
    if (
      initialRange === "monthly" ||
      initialRange === "weekly" ||
      initialRange === "quarterly"
    ) {
      setRange(initialRange);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [profileRes, historyRes, trendRes] = await Promise.all([
          fetch(`${API_BASE}/students/${studentId}/profile`, { headers }),
          fetch(`${API_BASE}/students/${studentId}/history`, { headers }),
          fetch(
            `${API_BASE}/students/${studentId}/symptom-trends?range=${range}`,
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
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);

          setSymptomLogs(
            historyData.symptomLogs.filter(
              (l: SymptomLogEntry) => new Date(l.createdAt) >= cutoff
            )
          );
          setEmotionCheckins(
            historyData.emotionCheckins.filter(
              (c: EmotionCheckinEntry) => new Date(c.createdAt) >= cutoff
            )
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
  }, [studentId, range]);

  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Screen-only controls */}
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-6 print:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => setRange("weekly")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              range === "weekly"
                ? "bg-sky-300 text-gray-900"
                : "bg-sky-100 text-gray-700 hover:bg-sky-200"
            }`}
          >
            Weekly (Last 7 Days)
          </button>
          <button
            onClick={() => setRange("monthly")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              range === "monthly"
                ? "bg-sky-300 text-gray-900"
                : "bg-sky-100 text-gray-700 hover:bg-sky-200"
            }`}
          >
            Monthly (Last 5 Weeks)
          </button>
          <button
            onClick={() => setRange("quarterly")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              range === "quarterly"
                ? "bg-sky-300 text-gray-900"
                : "bg-sky-100 text-gray-700 hover:bg-sky-200"
            }`}
          >
            3-Month Final Conclusion
          </button>
        </div>
        <button
          onClick={() => window.print()}
          disabled={loading || !!error}
          className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded disabled:opacity-60"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Printable sheet */}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-md print:rounded-none p-8">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading report...</p>
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
                value={`${student?.firstName} ${student?.lastName}`}
              />
              <InfoRow
                label="Grade"
                value={`${student?.grade}${
                  student?.section ? " · " + student.section : ""
                }`}
              />
              <InfoRow label="Diagnosis" value={student?.diagnosis || "—"} />
              <InfoRow
                label="Communication Level"
                value={student?.communicationLevel || "—"}
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
                    : "3-Month Final Conclusion (Last 92 Days)"
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
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Symptoms Observed
                      </th>
                      <th className="py-1.5 font-semibold text-gray-600">
                        Medication
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomLogs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-600">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 align-top text-gray-800">
                          {log.symptoms.join("; ")}
                          {log.additionalNotes && (
                            <p className="text-gray-400 mt-0.5">
                              Note: {log.additionalNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-2 align-top text-gray-800">
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
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Child
                      </th>
                      <th className="py-1.5 pr-3 font-semibold text-gray-600">
                        Teacher
                      </th>
                      <th className="py-1.5 font-semibold text-gray-600">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emotionCheckins.map((c) => (
                      <tr key={c._id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                          {new Date(c.createdAt).toLocaleDateString()}
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
   