"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ParentDashboardLayout from "@/components/ParentDashboardLayout";
import PinGate from "@/components/PinGate";

interface SymptomLogEntry {
  _id: string;
  symptoms: string[];
  additionalNotes?: string;
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
          "http://localhost:5000/api/students/child",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const childData = await childRes.json();
        if (!childData.success) {
          setError(childData.message || "Could not load your child's profile");
          return;
        }
        setChildId(childData.student._id);

        const historyRes = await fetch(
          `http://localhost:5000/api/students/${childData.student._id}/history`,
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
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-4 py-4 text-gray-400">
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
    <ParentDashboardLayout>
      <Link
        href="/dashboard/parent"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Symptom History
      </h1>

      <PinGate>
        <SymptomHistoryContent />
      </PinGate>
    </ParentDashboardLayout>
  );
}
