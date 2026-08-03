"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import BackButton from "@/components/BackButton";
import EmotionCheckinModal from "@/components/EmotionCheckinModal";

import { API_BASE } from "@/lib/config";
interface StudentSummary {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
}

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
  academicYear?: string;
  term?: string;
  teacher?: string;
}

interface TodayCheckin {
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore?: number;
}

interface ActivityCard {
  key: string;
  category: string;
  icon: string;
  title: string;
  color: string;
  description: string;
}

interface ActivityPlan {
  band: "low" | "steady" | "positive";
  cards: ActivityCard[];
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
  const [history, setHistory] = useState<EmotionCheckinEntry[]>([]);
  const [today, setToday] = useState<TodayCheckin | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityPlan, setActivityPlan] = useState<ActivityPlan | null>(null);
  const [diagnosis, setDiagnosis] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCheckinId, setEditingCheckinId] = useState<string | null>(
    null
  );
  const [editChildEmoji, setEditChildEmoji] = useState("");
  const [editTeacherEmoji, setEditTeacherEmoji] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  // The token isn't encrypted, just signed — decode the payload to read the
  // logged-in user's own id so edit/delete icons only show on check-ins
  // this teacher recorded themselves (the backend also enforces this).
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
      `${API_BASE}/teacher/students/${studentId}/emotion-history`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) {
      setHistory(data.checkins);
      setActivityPlan(data.activityPlan || null);
      setDiagnosis(data.diagnosis || "");
    }
  };

  const loadToday = async () => {
    const res = await fetch(
      `${API_BASE}/teacher/students/${studentId}/today`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) setToday(data.emotionCheckin || null);
  };

  const startEditCheckin = (c: EmotionCheckinEntry) => {
    setEditingCheckinId(c._id);
    setEditChildEmoji(c.childEmoji || "");
    setEditTeacherEmoji(c.teacherEmoji || "");
  };

  const saveEditCheckin = async (checkinId: string) => {
    setSavingEdit(true);
    try {
      const res = await fetch(
        `${API_BASE}/teacher/emotion-checkin/${checkinId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            childEmoji: editChildEmoji,
            teacherEmoji: editTeacherEmoji,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEditingCheckinId(null);
        await Promise.all([loadHistory(), loadToday()]);
      } else {
        alert(data.message || "Could not update check-in");
      }
    } catch (err) {
      console.error("Failed to update check-in", err);
      alert("Unable to reach the server");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCheckin = async (checkinId: string) => {
    if (!confirm("Delete this emotion check-in?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/teacher/emotion-checkin/${checkinId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadHistory(), loadToday()]);
      } else {
        alert(data.message || "Could not delete check-in");
      }
    } catch (err) {
      console.error("Failed to delete check-in", err);
      alert("Unable to reach the server");
    }
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

  const bothDoneToday = Boolean(today?.childEmoji && today?.teacherEmoji);

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
          <BackButton />

          <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
            Emotion Tracker
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {student?.fullName} · {student?.grade}
            {student?.section ? ` · ${student.section}` : ""}
          </p>

          {/* Today's check-in status + entry point into the popup */}
          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1">
                  Today&apos;s Check-in
                </h2>
                {bothDoneToday ? (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      {student?.fullName?.split(" ")[0]}:{" "}
                      <span className="text-xl align-middle">
                        {today?.childEmoji && EMOJI_ICON[today.childEmoji]}
                      </span>
                    </span>
                    <span>
                      You:{" "}
                      <span className="text-xl align-middle">
                        {today?.teacherEmoji && EMOJI_ICON[today.teacherEmoji]}
                      </span>
                    </span>
                    <span className="text-gray-400">
                      Score: {today?.compositeScore}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No check-in recorded yet today. Start one below — the
                    child taps first, then you record your own observation.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded whitespace-nowrap"
              >
                {bothDoneToday ? "Add Another Check-in" : "Start Check-in"}
              </button>
            </div>
          </div>

          {/* Suggested activities — based on the most recent check-in's
              mood, today's logged symptoms, and the child's own diagnosis
              (see backend/utils/activityPlanEngine.js). Shown alongside
              History so it doesn't require starting a fresh check-in just
              to see it. */}
          {activityPlan && (
            <div className="bg-white rounded-md shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Suggested Activities
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Based on {student?.fullName?.split(" ")[0] || "the child"}
                &apos;s recorded emotion
                {diagnosis ? ` and their diagnosis (${diagnosis})` : ""}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activityPlan.cards.map((card) => (
                  <div
                    key={card.key}
                    className={`rounded-md p-4 flex items-start gap-3 ${card.color}`}
                  >
                    <span className="text-2xl leading-none">{card.icon}</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        {card.category}
                      </p>
                      <p className="font-semibold">{card.title}</p>
                      <p className="text-sm opacity-90">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  <th className="px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-gray-400">
                      No check-ins yet.
                    </td>
                  </tr>
                ) : (
                  history.map((c) =>
                    editingCheckinId === c._id ? (
                      <tr key={c._id} className="border-b border-gray-50">
                        <td colSpan={5} className="px-4 py-4">
                          <p className="text-xs text-gray-500 mb-2">Child</p>
                          <div className="flex gap-2 mb-3">
                            {EMOJI_OPTIONS.map((opt) => (
                              <button
                                type="button"
                                key={`edit-child-${opt.value}`}
                                onClick={() => setEditChildEmoji(opt.value)}
                                title={opt.label}
                                className={`w-9 h-9 rounded-full text-base flex items-center justify-center border transition-colors ${
                                  editChildEmoji === opt.value
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                {opt.icon}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">Teacher</p>
                          <div className="flex gap-2 mb-3">
                            {EMOJI_OPTIONS.map((opt) => (
                              <button
                                type="button"
                                key={`edit-teacher-${opt.value}`}
                                onClick={() => setEditTeacherEmoji(opt.value)}
                                title={opt.label}
                                className={`w-9 h-9 rounded-full text-base flex items-center justify-center border transition-colors ${
                                  editTeacherEmoji === opt.value
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                {opt.icon}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEditCheckin(c._id)}
                              disabled={savingEdit}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-60"
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCheckinId(null)}
                              className="text-xs text-gray-500 px-4 py-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
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
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {c.teacher === currentUserId && (
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => startEditCheckin(c)}
                                className="text-gray-300 hover:text-blue-600 transition-colors"
                                aria-label="Edit check-in"
                                title="Edit"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCheckin(c._id)}
                                className="text-gray-300 hover:text-red-600 transition-colors"
                                aria-label="Delete check-in"
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

          <EmotionCheckinModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            studentId={studentId}
            studentName={student?.fullName || ""}
            onCompleted={() => {
              loadToday();
              loadHistory();
            }}
          />
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
