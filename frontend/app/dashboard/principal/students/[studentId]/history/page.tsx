"use client";

import { use, useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";

interface SymptomLogEntry {
  _id: string;
  symptoms: string[];
  additionalNotes?: string;
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
  very_sad: "😢",
  sad: "🙁",
  neutral: "😐",
  happy: "🙂",
  very_happy: "😄",
};

export default function PrincipalStudentHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [emotionCheckins, setEmotionCheckins] = useState<
    EmotionCheckinEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(
          `${API_BASE}/students/${studentId}/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setSymptomLogs(data.symptomLogs);
          setEmotionCheckins(data.emotionCheckins);
        } else {
          setError(data.message || "Could not load history");
        }
      } catch (err) {
        console.error("Failed to load history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [studentId]);

  return (
    <PrincipalDashboardLayout>
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Student History
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
              Symptom Logs
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
                {symptomLogs.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-gray-400">
                      No symptom logs yet.
                    </td>
                  </tr>
                ) : (
                  symptomLogs.map((log) => (
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
              Emotion Check-ins
            </h2>
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Child
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Teacher
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {emotionCheckins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-gray-400">
                      No check-ins yet.
                    </td>
                  </tr>
                ) : (
                  emotionCheckins.map((c) => (
                    <tr key={c._id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-lg">
                        {c.childEmoji ? (
                          EMOJI_ICON[c.childEmoji]
                        ) : (
                          <span className="text-xs text-gray-300">Not yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-lg">
                        {c.teacherEmoji ? (
                          EMOJI_ICON[c.teacherEmoji]
                        ) : (
                          <span className="text-xs text-gray-300">Not yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.compositeScore}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PrincipalDashboardLayout>
  );
}
