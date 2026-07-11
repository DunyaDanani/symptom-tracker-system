"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SymptomTrendChart from "@/components/SymptomTrendChart";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";

// Same day-count windows the printable report uses, so the on-screen
// Medication Log matches whatever "Symptom Trends" is currently showing.
const RANGE_DAYS: Record<"weekly" | "monthly" | "quarterly", number> = {
  weekly: 7,
  monthly: 35,
  quarterly: 92,
};

interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
}

interface SymptomLogEntry {
  _id: string;
  medications?: MedicationEntry[];
  medicationNotes?: string;
  createdAt: string;
}

// Shared symptom-trend report used by both the parent and child dashboards
// — same chart, same weekly/monthly toggle, resolved through the unified
// /api/students/linked endpoint so it works for either role's token.
export default function ReportsContent() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [range, setRange] = useState<"weekly" | "monthly" | "quarterly">(
    "weekly"
  );
  const [trend, setTrend] = useState<{ label: string; count: number }[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/students/linked`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setStudentId(data.student._id);
        } else {
          setError(data.message || "Could not load the linked profile");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load linked profile", err);
        setError("Unable to reach the server");
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const loadTrend = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/students/${studentId}/symptom-trends?range=${range}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.success) {
          setTrend(data.trend);
        } else {
          setError(data.message || "Could not load report");
        }
      } catch (err) {
        console.error("Failed to load symptom trends", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    loadTrend();
  }, [studentId, range]);

  useEffect(() => {
    if (!studentId) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/students/${studentId}/history`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.success) {
          setSymptomLogs(data.symptomLogs);
        }
      } catch (err) {
        console.error("Failed to load medication history", err);
      }
    };

    loadHistory();
  }, [studentId]);

  const medicationCutoff = new Date();
  medicationCutoff.setDate(medicationCutoff.getDate() - RANGE_DAYS[range]);

  const medicationRows = symptomLogs
    .filter(
      (log) =>
        new Date(log.createdAt) >= medicationCutoff &&
        log.medications &&
        log.medications.length > 0
    )
    .flatMap((log) =>
      (log.medications || []).map((m, i) => ({
        key: `${log._id}-${i}`,
        date: log.createdAt,
        name: m.name,
        dosage: m.dosage,
        time: m.time,
        notes: log.medicationNotes,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <div className="flex items-center justify-between mt-2 mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">Reports</h1>
        <div className="flex items-center gap-3">
          {studentId && (
            <Link
              href={`/dashboard/print-report/${studentId}?range=${range}`}
              target="_blank"
              className="text-sm bg-blue-900 hover:bg-blue-800 text-white rounded-full px-4 py-1.5"
            >
              Print Report
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setRange("weekly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "weekly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Weekly Report
        </button>
        <button
          onClick={() => setRange("monthly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "monthly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Monthly Report
        </button>
        <button
          onClick={() => setRange("quarterly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "quarterly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Quarterly Report
        </button>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          Symptom Trends{" "}
          <span className="font-normal text-gray-400">
            (
            {range === "weekly"
              ? "Last 7 Days"
              : range === "monthly"
                ? "Last 5 Weeks"
                : "Last 13 Weeks"}
            )
          </span>
        </h2>

        {loading ? (
          <p className="text-gray-400 text-sm mt-6">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm mt-6">{error}</p>
        ) : (
          <SymptomTrendChart data={trend} />
        )}
      </div>

      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-800 p-6 pb-4">
          Medication Log{" "}
          <span className="font-normal text-gray-400">
            (
            {range === "weekly"
              ? "Last 7 Days"
              : range === "monthly"
                ? "Last 5 Weeks"
                : "Last 13 Weeks"}
            )
          </span>
        </h2>
        {medicationRows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-400">
            No medication recorded in this period.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-2 font-semibold text-gray-700">
                  Date
                </th>
                <th className="px-6 py-2 font-semibold text-gray-700">
                  Medication
                </th>
                <th className="px-6 py-2 font-semibold text-gray-700">
                  Dosage
                </th>
                <th className="px-6 py-2 font-semibold text-gray-700">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {medicationRows.map((row) => (
                <tr key={row.key} className="border-b border-gray-50">
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-gray-800">
                    {row.name}
                    {row.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {row.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {row.dosage || "—"}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {row.time || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
