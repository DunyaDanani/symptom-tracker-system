"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SecureContentGate from "@/components/SecureContentGate";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";

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
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  const recent = checkins.slice(0, 7);
  const avgScore =
    recent.length > 0
      ? recent.reduce((sum, c) => sum + c.compositeScore, 0) / recent.length
      : null;
  const suggestions = getSuggestions(avgScore);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
          Check-in History
        </h2>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Child</th>
              <th className="px-4 py-3 font-semibold text-gray-700">
                Teacher
              </th>
              <th className="px-4 py-3 font-semibold text-gray-700">Score</th>
            </tr>
          </thead>
          <tbody>
            {checkins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-gray-400">
                  No check-ins yet.
                </td>
              </tr>
            ) : (
              checkins.map((c) => (
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

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Suggested Activities
        </h2>
        {suggestions ? (
          <>
            <p className="text-xs text-gray-500 mb-4">{suggestions.label}</p>
            <ul className="space-y-3">
              {suggestions.activities.map((activity, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-pink-500 mt-0.5">•</span>
                  <span>{activity}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-gray-400 text-sm">
            Suggestions will appear once check-ins are recorded.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ParentEmotionHistoryPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Emotion Tracker
      </h1>

      <SecureContentGate subject="Emotion History">
        <EmotionHistoryContent />
      </SecureContentGate>
    </FamilyDashboardLayout>
  );
}
