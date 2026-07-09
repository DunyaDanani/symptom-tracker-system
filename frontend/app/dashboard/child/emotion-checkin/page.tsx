"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ChildDashboardLayout from "@/components/ChildDashboardLayout";

const API_BASE = "http://localhost:5000/api";

const EMOJI_OPTIONS: { value: string; icon: string; label: string }[] = [
  { value: "very_sad", icon: "😢", label: "Very Sad" },
  { value: "sad", icon: "🙁", label: "Sad" },
  { value: "neutral", icon: "😐", label: "Okay" },
  { value: "happy", icon: "🙂", label: "Happy" },
  { value: "very_happy", icon: "😄", label: "Very Happy" },
];

export default function ChildEmotionCheckinPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/students/emotion-checkin/today`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          if (data.checkin?.childEmoji) {
            setSelected(data.checkin.childEmoji);
          }
        } else {
          setError(data.message || "Could not load today's check-in");
        }
      } catch (err) {
        console.error("Failed to load today's check-in", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSelect = async (emoji: string) => {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE}/students/emotion-checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(emoji);
        const label = EMOJI_OPTIONS.find((o) => o.value === emoji)?.label;
        setStatus(`Thanks! You said you're feeling ${label} today.`);
      } else {
        setStatus(data.message || "Could not save your check-in.");
      }
    } catch (err) {
      console.error("Failed to submit check-in", err);
      setStatus("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ChildDashboardLayout>
      <Link
        href="/dashboard/child"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Emotion Tracker
      </h1>
      <p className="text-sm text-gray-500 mb-8">How do you feel today?</p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="bg-white rounded-md shadow-sm p-8 max-w-xl">
          <div className="flex justify-between gap-3 mb-6">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                disabled={saving}
                title={opt.label}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition-colors disabled:opacity-60 ${
                  selected === opt.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="text-4xl">{opt.icon}</span>
                <span className="text-xs font-medium text-gray-600">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {status && (
            <p className="text-sm text-center text-gray-600">{status}</p>
          )}

          {!status && selected && (
            <p className="text-sm text-center text-gray-400">
              You can tap a different one anytime today to change it.
            </p>
          )}
        </div>
      )}
    </ChildDashboardLayout>
  );
}
