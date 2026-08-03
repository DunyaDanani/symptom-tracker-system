"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";

interface ActivityCard {
  key: string;
  category: string;
  icon: string;
  title: string;
  color: string;
  description: string;
}

const BAND_MESSAGE: Record<string, string> = {
  low: "Here are some gentle activities picked just for you today. 💙",
  steady: "Here's your activity plan for today! ✨",
  positive: "You're having a great day! Here's what's up next. 🌟",
};

// When context is "home" (checked in outside school hours), swap in a
// version of the same message that doesn't assume a classroom is nearby.
const HOME_BAND_MESSAGE: Record<string, string> = {
  low: "School's out, but these gentle ideas can still help you feel better. 💙",
  steady: "Here are some fun things to try at home tonight! ✨",
  positive: "Sounds like a great day! Here's something fun for this evening. 🌟",
};

const CATEGORY_BADGE: Record<string, string> = {
  Aesthetic: "bg-pink-100 text-pink-700",
  Social: "bg-purple-100 text-purple-700",
  Academic: "bg-amber-100 text-amber-700",
};

export default function ChildActivityPlanPage() {
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [band, setBand] = useState("steady");
  const [context, setContext] = useState<"school" | "home">("school");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/students/activity-plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setCards(data.cards);
          setBand(data.band);
          if (data.context) setContext(data.context);
        } else {
          setError(data.message || "Could not load your activity plan");
        }
      } catch (err) {
        console.error("Failed to load activity plan", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <FamilyDashboardLayout role="child">
      <BackButton />

      <h1 className="text-3xl font-bold text-blue-900 mt-2 mb-1">
        🌈 My Activities
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {context === "home"
          ? HOME_BAND_MESSAGE[band] || HOME_BAND_MESSAGE.steady
          : BAND_MESSAGE[band] || BAND_MESSAGE.steady}
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div
              key={card.key}
              className="bg-white rounded-3xl shadow-sm p-7 flex flex-col items-center gap-3 text-center hover:shadow-lg hover:-translate-y-1 transition-all border-2 border-transparent hover:border-sky-100"
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 ${
                  CATEGORY_BADGE[card.category] || "bg-gray-100 text-gray-600"
                }`}
              >
                {card.category}
              </span>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${card.color}`}
              >
                {card.icon}
              </div>
              <p className="text-base font-bold text-gray-800">
                {card.title}
              </p>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>
      )}
    </FamilyDashboardLayout>
  );
}
