"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ParentDashboardLayout from "@/components/ParentDashboardLayout";
import SymptomTrendChart from "@/components/SymptomTrendChart";

const API_BASE = "http://localhost:5000/api";

export default function ParentReportsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [trend, setTrend] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/students/child`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setStudentId(data.student._id);
        } else {
          setError(data.message || "Could not load your child's profile");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load child profile", err);
        setError("Unable to reach the server");
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const loadTrend = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/students/${studentId}/symptom-trends?range=${range}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.success) {
          setTrend(data.trend);
        } else {
          setError(data.message || "Could not load report");
        }
      } catch (err) {
        console.error("Failed to load symptom trends", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    loadTrend();
  }, [studentId, range]);

  return (
    <ParentDashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">Reports</h1>
        <div className="flex items-center gap-3">
          {studentId && (
            <Link
              href={`/dashboard/print-report/${studentId}?range=${range}`}
              target="_blank"
              className="text-sm bg-blue-900 hover:bg-blue-800 text-white rounded-full px-4 py-1.5"
            >
              Print Report
            </Link>
          )}
          <button
            onClick={() => router.back()}
            className="text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            &lsaquo; Back
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setRange("weekly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "weekly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Weekly Report
        </button>
        <button
          onClick={() => setRange("monthly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "monthly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Monthly Report
        </button>
      </div>

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          Symptom Trends{" "}
          <span className="font-normal text-gray-400">
            ({range === "weekly" ? "Last 7 Days" : "Last 5 Weeks"})
          </span>
        </h2>

        {loading ? (
          <p className="text-gray-400 text-sm mt-6">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm mt-6">{error}</p>
        ) : (
          <SymptomTrendChart data={trend} />
        )}
      </div>
    </ParentDashboardLayout>
  );
}
