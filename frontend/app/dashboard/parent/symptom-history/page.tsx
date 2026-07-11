"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SecureContentGate from "@/components/SecureContentGate";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";

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

function SymptomHistoryContent() {
  const [childId, setChildId] = useState<string | null>(null);
  const [logs, setLogs] = useState<SymptomLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const childRes = await fetch(
          `${API_BASE}/students/child`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const childData = await childRes.json();
        if (!childData.success) {
          setError(childData.message || "Could not load your child's profile");
          return;
        }
        setChildId(childData.student._id);

        const historyRes = await fetch(
          `${API_BASE}/students/${childData.student._id}/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const historyData = await historyRes.json();
        if (historyData.success) {
          setLogs(historyData.symptomLogs);
        } else {
          setError(historyData.message || "Could not load symptom history");
        }
      } catch (err) {
        console.error("Failed to load symptom history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  return (
    <div className="bg-white rounded-md shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Symptoms</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Medication</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-gray-400">
                No symptom logs yet.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log._id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap align-top">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  <ul className="list-disc list-inside space-y-0.5">
                    {log.symptoms.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  {log.additionalNotes && (
                    <p className="text-xs text-gray-400 mt-1">
                      {log.additionalNotes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-800 align-top">
                  {log.medications && log.medications.length > 0 ? (
                    <ul className="space-y-0.5">
                      {log.medications.map((m, i) => (
                        <li key={i} className="text-xs">
                          💊 {m.name}
                          {m.dosage ? ` (${m.dosage})` : ""}
                          {m.time ? ` — ${m.time}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                  {log.medicationNotes && (
                    <p className="text-xs text-gray-400 mt-1">
                      {log.medicationNotes}
                    </p>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ParentSymptomHistoryPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Symptom History
      </h1>

      <SecureContentGate subject="Symptom History">
        <SymptomHistoryContent />
      </SecureContentGate>
    </FamilyDashboardLayout>
  );
}
               