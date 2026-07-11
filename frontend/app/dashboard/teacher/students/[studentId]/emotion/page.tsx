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
}

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
}

interface TodayCheckin {
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore?: number;
}

const EMOJI_OPTIONS: { value: string; icon: string; label: string }[] = [
  { value: "very_sad", icon: "😢", label: "Very sad" },
  { value: "sad", icon: "🙁", label: "Sad" },
  { value: "neutral", icon: "😐", label: "Neutral" },
  { value: "happy", icon: "🙂", label: "Happy" },
  { value: "very_happy", icon: "😄", label: "Very happy" },
];

const EMOJI_ICON: Record<string, string> = Object.fromEntries(
  EMOJI_OPTIONS.map((o) => [o.value, o.icon])
);

export default function TeacherEmotionTrackerPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [teacherEmoji, setTeacherEmoji] = useState("");
  const [history, setHistory] = useState<EmotionCheckinEntry[]>([]);
  const [today, setToday] = useState<TodayCheckin | null>(null);

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
      `${API_BASE}/teacher/students/${studentId}/emotion-history`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) setHistory(data.checkins);
  };

  const loadToday = async () => {
    const res = await fetch(
      `${API_BASE}/teacher/students/${studentId}/today`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) setToday(data.emotionCheckin || null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const studentsRes = await fetch(`${API_BASE}/teacher/students`, {
          headers: authHeaders(),
        });
        const studentsData = await studentsRes.json();

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

        await Promise.all([loadHistory(), loadToday()]);
      } catch (err) {
        console.error("Failed to load emotion tracker data", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const submitEmotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");

    if (!teacherEmoji) {
      setStatus("Select your observed emoji.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/emotion-checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ studentId, teacherEmoji }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(
          `Check-in saved (composite score: ${data.checkin.compositeScore})`
        );
        setTeacherEmoji("");
        await Promise.all([loadHistory(), loadToday()]);
      } else {
        setStatus(data.message || "Could not save check-in.");
      }
    } catch (err) {
      console.error("Failed to submit emotion check-in", err);
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
            Emotion Tracker
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {student?.firstName} {student?.lastName} · Grade {student?.grade}
            {student?.section ? ` · ${student.section}` : ""}
          </p>

          {/* Step 1: the child's own check-in for today */}
          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              Step 1 · Child&apos;s Check-in Today
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              The child checks in first, from their own dashboard — anytime
              during the day.
            </p>

            {today?.childEmoji ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {EMOJI_ICON[today.childEmoji]}
                </span>
                <span className="text-sm text-gray-700">
                  {student?.firstName} said they&apos;re feeling{" "}
                  {EMOJI_OPTIONS.find((o) => o.value === today.childEmoji)
                    ?.label || today.childEmoji}{" "}
                  today.
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {student?.firstName} hasn&apos;t checked in yet today. You
                can still add your own observation below — the child&apos;s
                side will fill in whenever they do.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion check-in form */}
            <form
              onSubmit={submitEmotion}
              className="bg-white rounded-md shadow-sm p-6"
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Step 2 · Your Observation
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Record your own independent observation of how the child
                seemed today — separate from what they reported above.
              </p>

              <p className="text-xs text-gray-500 mb-2">
                Your observed emoji
              </p>
              <div className="flex gap-2 mb-4">
                {EMOJI_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={`teacher-${opt.value}`}
                    onClick={() => setTeacherEmoji(opt.value)}
                    title={opt.label}
                    className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border transition-colors ${
                      teacherEmoji === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>

              {status && <p className="text-xs text-gray-500 mb-3">{status}</p>}

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Check-in"}
              </button>
            </form>

            {/* Emotion history */}
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
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-gray-400">
                        No check-ins yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((c) => (
                      <tr key={c._id} className="border-b border-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-lg">
                          {c.childEmoji ? (
                            EMOJI_ICON[c.childEmoji]
                          ) : (
                            <span className="text-xs text-gray-300">
                              Not yet
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-lg">
                          {c.teacherEmoji ? (
                            EMOJI_ICON[c.teacherEmoji]
                          ) : (
                            <span className="text-xs text-gray-300">
                              Not yet
                            </span>
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
        </>
      )}
    </TeacherDashboardLayout>
  );
}
