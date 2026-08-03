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
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody>
                {symptomLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-gray-400">
                      No symptom logs yet.
                    </td>
                  </tr>
                ) : (
                  symptomLogs.map((log) => (
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
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatRecordedBy(log.teacher)}
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
                        {c.academicYear && c.term && (
                          <p className="text-xs text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                            {c.academicYear} {c.term}
                          </p>
                        )}
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
