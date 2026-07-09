"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import MiniCalendar from "@/components/MiniCalendar";

interface TeacherProfile {
  name: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
}

const tiles = [
  {
    label: "Emotion Tracker",
    icon: EmotionIcon,
    color: "bg-pink-50 text-pink-600",
    href: "/dashboard/teacher/emotion-tracking",
  },
  {
    label: "Symptom Tracking",
    icon: SymptomIcon,
    color: "bg-orange-50 text-orange-600",
    href: "/dashboard/teacher/students",
  },
  {
    label: "Study Module",
    icon: StudyIcon,
    color: "bg-blue-50 text-blue-600",
    href: null,
  },
  {
    label: "Reports",
    icon: ReportsIcon,
    color: "bg-emerald-50 text-emerald-600",
    href: "/dashboard/teacher/reports",
  },
];

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today] = useState(new Date());

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/teacher/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setTeacher(data.teacher);
        } else {
          setError(data.message || "Could not load your profile");
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <TeacherDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mb-8">Dashboard</h1>

      {/* Icon tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {tiles.map((tile) => {
          const card = (
            <div className="bg-white rounded-md shadow-sm px-5 py-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${tile.color}`}
              >
                <tile.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-700 text-center">
                {tile.label}
              </p>
            </div>
          );

          return tile.href ? (
            <Link key={tile.label} href={tile.href}>
              {card}
            </Link>
          ) : (
            <div key={tile.label} className="cursor-default">
              {card}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher info card */}
        <div className="bg-white rounded-md shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            My Info
          </h2>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : teacher ? (
            <dl className="space-y-3 text-sm">
              <Row label="Name" value={teacher.name} />
              <Row
                label="Qualification"
                value={teacher.qualification || "—"}
              />
              <Row
                label="Specialization"
                value={teacher.specialization || "—"}
              />
              <Row
                label="Experience"
                value={`${teacher.experienceYears} year${
                  teacher.experienceYears === 1 ? "" : "s"
                }`}
              />
            </dl>
          ) : null}
        </div>

        {/* Calendar */}
        <MiniCalendar today={today} />
      </div>
    </TeacherDashboardLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}

function EmotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2zm-7.536 5.879a1 1 0 011.415 0 3 3 0 004.242 0 1 1 0 111.415 1.415 5 5 0 01-7.072 0 1 1 0 010-1.415z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SymptomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 00-1 1v1H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H9zm0 7a1 1 0 012 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V9z" />
    </svg>
  );
}

function StudyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM8 7a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}
