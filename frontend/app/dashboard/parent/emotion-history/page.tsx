"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SecureContentGate from "@/components/SecureContentGate";
import DateRangeFilter from "@/components/DateRangeFilter";
import { filterByDateRange } from "@/lib/dateRangeFilter";
import { API_BASE } from "@/lib/config";
import LoadingSkeleton from "@/components/Skeleton";
import ScoreNote from "@/components/ScoreNote";
import Pagination, { usePager, paginate } from "@/components/Pagination";

interface ActivityCard {
  key: string;
  category: string;
  icon: string;
  title: string;
  color: string;
  description: string;
}

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
  // The personalised plan (Aesthetic / Social / Academic) generated when
  // the shadow teacher completed this check-in — same cards the teacher
  // sees in the "Today's Activity Plan" pop-up.
  activityPlan?: { cards?: ActivityCard[] } | null;
}

const EMOJI_ICON: Record<string, string> = {
  very_sad: "😢",
  sad: "🙁",
  neutral: "😐",
  happy: "🙂",
  very_happy: "😄",
};

// Static, curated suggestions — no AI involved. Keyed off the average
// composite score (1-5 scale) from the child's recent check-ins.
const ACTIVITY_SUGGESTIONS: { max: number; label: string; activities: string[] }[] = [
  {
    max: 2,
    label: "Recent mood has been low",
    activities: [
      "Set aside 10 minutes of one-on-one quiet time with no screens",
      "Try a simple breathing exercise together (4 counts in, 4 counts out)",
      "Use a favorite comfort item or sensory toy during transitions",
    ],
  },
  {
    max: 3,
    label: "Mood has been mixed",
    activities: [
      "Take a short walk outside or do light stretching together",
      "Offer a choice between two calming activities (drawing, music, puzzle)",
      "Review the day's schedule together to reduce uncertainty",
    ],
  },
  {
    max: 4,
    label: "Mood has been steady",
    activities: [
      "Keep up the current routine — consistency is working well",
      "Add a small new activity to build on positive momentum (a game or craft)",
      "Praise specific moments of good regulation to reinforce them",
    ],
  },
  {
    max: 5.01,
    label: "Mood has been positive",
    activities: [
      "Celebrate the good stretch with a favorite activity or small reward",
      "Try introducing a slightly more challenging task while confidence is high",
      "Note what's been working so it can be repeated on harder days",
    ],
  },
];

function getSuggestions(avgScore: number | null) {
  if (avgScore === null) return null;
  return (
    ACTIVITY_SUGGESTIONS.find((tier) => avgScore <= tier.max) ||
    ACTIVITY_SUGGESTIONS[ACTIVITY_SUGGESTIONS.length - 1]
  );
}

function EmotionHistoryContent() {
  const [checkins, setCheckins] = useState<EmotionCheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const emotionPager = usePager();

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

        const historyRes = await fetch(
          `${API_BASE}/students/${childData.student._id}/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const historyData = await historyRes.json();
        if (historyData.success) {
          setCheckins(historyData.emotionCheckins);
        } else {
          setError(historyData.message || "Could not load emotion history");
        }
      } catch (err) {
        console.error("Failed to load emotion history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  // Suggested activities are always based on the most recent 7 check-ins
  // overall, regardless of the date filter applied to the table below —
  // the filter is for browsing history, not for changing the suggestion.
  const recent = checkins.slice(0, 7);
  const avgScore =
    recent.length > 0
      ? recent.reduce((sum, c) => sum + c.compositeScore, 0) / recent.length
      : null;
  const suggestions = getSuggestions(avgScore);

  // Most recent check-in that has a personalised plan.
  const latestPlan = checkins.find((c) => c.activityPlan?.cards?.length);
  const planCards = latestPlan?.activityPlan?.cards || [];

  const filteredCheckins = filterByDateRange(
    checkins,
    dateFrom,
    dateTo,
    (c) => c.createdAt
  );
  const emotionPage = paginate(filteredCheckins, emotionPager);

  return (
    <div className="space-y-6">
      {/* Suggested activities — compact cards, same style as the teacher's
          "Today's Activity Plan" pop-up */}
      <div className="bg-white rounded-md shadow-sm p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-700">
            Suggested Activities
          </h2>
          <p className="text-xs text-gray-500">
            {planCards.length > 0 && latestPlan
              ? `Based on the check-in on ${new Date(latestPlan.createdAt).toLocaleDateString()}`
              : suggestions?.label}
          </p>
        </div>
        {/* Explains where these come from, for anyone seeing this for the first time */}
        <p className="text-sm text-gray-500 mt-1 mb-4">
          {planCards.length > 0
            ? "Personalised for your child by analysing their latest emotion check-in — how they said they felt and how their shadow teacher saw them — together with their diagnosis and any symptoms logged that day. You get one creative (aesthetic), one social and one academic activity to try at home."
            : "General ideas based on your child's average mood across their last 7 emotion check-ins. Personalised activities will appear here after the next completed check-in."}
        </p>

        {planCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {planCards.map((card) => (
              <div
                key={card.key}
                className={`rounded-md p-4 flex items-start gap-3 ${card.color}`}
              >
                <span className="text-2xl leading-none">{card.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    {card.category}
                  </p>
                  <p className="font-semibold">{card.title}</p>
                  <p className="text-sm opacity-90">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : suggestions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestions.activities.map((activity, i) => (
              <div
                key={i}
                className="rounded-md p-4 bg-sky-50 text-sky-900 text-sm"
              >
                {activity}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            Suggestions will appear once check-ins are recorded.
          </p>
        )}
      </div>

      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
          Check-in History
        </h2>
        <div className="px-6 pt-4">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
            }}
            resultCount={filteredCheckins.length}
          />
        </div>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Child</th>
              <th className="px-4 py-3 font-semibold text-gray-700">
                Teacher
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700" title="1 = very sad, 5 = very happy">Score (1–5)</th>
            </tr>
          </thead>
          <tbody>
            {filteredCheckins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-gray-400">
                  {checkins.length === 0
                    ? "No check-ins yet."
                    : "No check-ins in this date range."}
                </td>
              </tr>
            ) : (
              emotionPage.items.map((c) => (
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
        <Pagination page={emotionPage} pager={emotionPager} />
        <ScoreNote className="px-4 py-3 border-t border-gray-50" />
      </div>

    </div>
  );
}

export default function ParentEmotionHistoryPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">
        Emotion Tracker
      </h1>

      <SecureContentGate subject="Emotion History">
        <EmotionHistoryContent />
      </SecureContentGate>
    </FamilyDashboardLayout>
  );
}
