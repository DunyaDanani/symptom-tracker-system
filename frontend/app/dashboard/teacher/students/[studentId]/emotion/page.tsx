"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import SubpageHeader from "@/components/SubpageHeader";
import EmotionCheckinModal from "@/components/EmotionCheckinModal";

import { API_BASE } from "@/lib/config";
interface StudentSummary {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
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

const EMOJI_ICON: Record<string, string> = {
  very_sad: "😢",
  sad: "🙁",
  neutral: "😐",
  happy: "🙂",
  very_happy: "😄",
};

// Recording a check-in only — "Today's Check-in" status, the Start
// Check-in popup, and the resulting Suggested Activities. Browsing past
// check-ins (with edit/delete) lives on the separate read-only History
// page so the check-in flow and the log list never sit on the same
// screen.
export default function TeacherEmotionTrackerPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [today, setToday] = useState<TodayCheckin | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityPlan, setActivityPlan] = useState<ActivityPlan | null>(null);
  const [diagnosis, setDiagnosis] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  // Reuses the history endpoint purely to get the latest activity plan +
  // diagnosis for the "Suggested Activities" panel below — the check-in
  // list itself isn't rendered here (see the History page for that).
  const loadLatestPlan = async () => {
    const res = await fetch(
      `${API_BASE}/teacher/students/${studentId}/emotion-history`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (data.success) {
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

        await Promise.all([loadLatestPlan(), loadToday()]);
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
          <SubpageHeader
            title="Emotion Tracker"
            subtitle={`${student?.fullName ?? ""} · ${student?.grade ?? ""}${
              student?.section ? ` · ${student.section}` : ""
            }`}
            action={{
              href: `/dashboard/teacher/students/${studentId}/emotion/history`,
              label: "View Full History",
              emphasis: "secondary",
            }}
          />

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

          {/* Suggested activities — AI-generated (NVIDIA-hosted model, see
              backend/utils/aiActivityPlanEngine.js) from the most recent
              check-in's child + teacher emojis and the child's own
              diagnosis, falling back to the deterministic rules engine
              only if every model call fails. Past check-ins and their own
              stored plans are on the separate History page. */}
          {activityPlan && (
            <div className="bg-white rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Suggested Activities
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Based on {student?.fullName?.split(" ")[0] || "the child"}
                &apos;s recorded emotion
                {diagnosis ? ` and their diagnosis (${diagnosis})` : ""}.
              </p>
              <ActivityCardGrid cards={activityPlan.cards} />
            </div>
          )}

          <EmotionCheckinModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            studentId={studentId}
            studentName={student?.fullName || ""}
            onCompleted={() => {
              loadToday();
              loadLatestPlan();
            }}
          />
        </>
      )}
    </TeacherDashboardLayout>
  );
}

// Shared renderer for a 3-card (Aesthetic/Social/Academic) activity plan.
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
