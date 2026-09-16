"use client";

import { Fragment, use, useEffect, useState } from "react";
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

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
  academicYear?: string;
  term?: string;
  teacher?: string;
  activityPlan?: ActivityPlan | null;
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

// Read-only emotion check-in history — the "Emotion History" card on the
// student hub links here. Recording a new check-in (and today's status /
// suggested-activities panel) is a separate flow at
// students/[studentId]/emotion/page.tsx, reached via the "+ Record
// Check-in" button below, so browsing history never mixes with the
// check-in popup.
export default function TeacherEmotionHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [history, setHistory] = useState<EmotionCheckinEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCheckinId, setEditingCheckinId] = useState<string | null>(
    null
  );
  const [editChildEmoji, setEditChildEmoji] = useState("");
  const [editTeacherEmoji, setEditTeacherEmoji] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Which history row (if any) currently has its AI-suggested activity
  // plan for that specific check-in expanded below it.
  const [expandedCheckinId, setExpandedCheckinId] = useState<string | null>(
    null
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    }
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
        await loadHistory();
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
        await loadHistory();
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

        await loadHistory();
      } catch (err) {
        console.error("Failed to load emotion history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const filteredHistory = filterByDateRange(
    history,
    dateFrom,
    dateTo,
    (c) => c.createdAt
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
            title="Emotion History"
            subtitle={`${student?.fullName ?? ""} · ${student?.grade ?? ""}${
              student?.section ? ` · ${student.section}` : ""
            }`}
            action={{
              href: `/dashboard/teacher/students/${studentId}/emotion`,
              label: "+ Record Check-in",
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
                    Child
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Teacher
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Score
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    Activities
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-gray-400">
                      {history.length === 0
                        ? "No check-ins yet."
                        : "No check-ins in this date range."}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((c) =>
                    editingCheckinId === c._id ? (
                      <tr key={c._id} className="border-b border-gray-50">
                        <td colSpan={6} className="px-4 py-4">
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
                      <Fragment key={c._id}>
                        <tr className="border-b border-gray-50">
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCheckinId(
                                  expandedCheckinId === c._id ? null : c._id
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
                            >
                              <ChevronIcon
                                className={`w-3.5 h-3.5 transition-transform ${
                                  expandedCheckinId === c._id
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                              {expandedCheckinId === c._id ? "Hide" : "View"}
                            </button>
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
                        {expandedCheckinId === c._id && (
                          <tr className="border-b border-gray-50 bg-gray-50/60">
                            <td colSpan={6} className="px-4 py-4">
                              {c.activityPlan?.cards?.length ? (
                                <>
                                  <p className="text-xs text-gray-400 mb-3">
                                    Suggested for this check-in
                                    {c.activityPlan.band
                                      ? ` · ${c.activityPlan.band} mood`
                                      : ""}
                                  </p>
                                  <ActivityCardGrid
                                    cards={c.activityPlan.cards}
                                  />
                                </>
                              ) : (
                                <p className="text-xs text-gray-400">
                                  No activity suggestion was generated for
                                  this check-in yet (usually because only
                                  one side had checked in).
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
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

// Shared renderer for a 3-card (Aesthetic/Social/Academic) activity plan —
// used for each expanded History row's stored activity plan.
function ActivityCardGrid({ cards }: { cards: ActivityCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
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
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
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
