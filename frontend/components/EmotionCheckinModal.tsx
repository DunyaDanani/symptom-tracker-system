"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { API_BASE } from "@/lib/config";

interface EmotionCheckinModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  /** Called once the full check-in (both taps + activity plan) is saved,
   * so the calling page can refresh its history/today state. */
  onCompleted?: () => void;
}

type Step = "child" | "teacher" | "result";

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

// Two-step, teacher-mediated emotion check-in popup. There is no child
// login: the shadow teacher hands their device to the child for step 1,
// then records their own independent observation in step 2. The moment
// step 2 is submitted, the backend has both emoji taps and immediately
// returns the FR-09 activity plan (one Aesthetic, one Social, one Academic
// activity), which this popup shows as its final step.
export default function EmotionCheckinModal({
  open,
  onClose,
  studentId,
  studentName,
  onCompleted,
}: EmotionCheckinModalProps) {
  const [step, setStep] = useState<Step>("child");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activityPlan, setActivityPlan] = useState<ActivityPlan | null>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);

  // Fresh start every time the popup is opened for a (possibly different)
  // student — a half-finished check-in from a previous open shouldn't
  // linger. There's no once-a-day limit on this popup (same as symptom
  // logging), so each open starts its own brand-new check-in record.
  useEffect(() => {
    if (open) {
      setStep("child");
      setError("");
      setActivityPlan(null);
      setCheckinId(null);
    }
  }, [open, studentId]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const submitChildEmoji = async (emoji: string) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/emotion-checkin/child`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ studentId, childEmoji: emoji }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Could not save the child's check-in.");
        return;
      }
      setCheckinId(data.checkin?._id || null);
      setStep("teacher");
    } catch (err) {
      console.error("Failed to submit child emoji", err);
      setError("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const submitTeacherEmoji = async (emoji: string) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/emotion-checkin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ studentId, teacherEmoji: emoji, checkinId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Could not save your observation.");
        return;
      }
      setActivityPlan(data.activityPlan);
      setStep("result");
      onCompleted?.();
    } catch (err) {
      console.error("Failed to submit teacher emoji", err);
      setError("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const firstName = studentName?.split(" ")[0] || "the child";

  const title =
    step === "child"
      ? `${firstName}'s Turn`
      : step === "teacher"
      ? "Your Observation"
      : "Today's Activity Plan";

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-lg">
      {step === "child" && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">
            Step 1 of 2 · Hand the device to {firstName}
          </p>
          <p className="text-base text-gray-700 mb-6">
            How are you feeling right now?
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-4">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => submitChildEmoji(opt.value)}
                title={opt.label}
                className="w-16 h-16 rounded-full text-3xl flex items-center justify-center border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {opt.icon}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}

      {step === "teacher" && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">
            Step 2 of 2 · Your turn
          </p>
          <p className="text-base text-gray-700 mb-6">
            Record your own independent observation of how {firstName} seemed
            today — separate from what they just tapped.
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-4">
            {EMOJI_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => submitTeacherEmoji(opt.value)}
                title={opt.label}
                className="w-16 h-16 rounded-full text-3xl flex items-center justify-center border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {opt.icon}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}

      {step === "result" && activityPlan && (
        <div>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Based on today&apos;s check-in, here&apos;s {firstName}&apos;s
            personalised plan:
          </p>
          <div className="space-y-3">
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
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
