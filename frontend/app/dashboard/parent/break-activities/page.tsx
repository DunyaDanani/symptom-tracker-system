"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import SecureContentGate from "@/components/SecureContentGate";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";

interface BreakActivityEntry {
  _id: string;
  activities: string[];
  notes?: string;
  createdAt: string;
}

function BreakActivityContent() {
  const [logs, setLogs] = useState<BreakActivityEntry[]>([]);
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

        const res = await fetch(
          `${API_BASE}/students/${childData.student._id}/break-activities`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        } else {
          setError(data.message || "Could not load break activity history");
        }
      } catch (err) {
        console.error("Failed to load break activities", err);
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

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
        No break-time activities logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log._id} className="bg-white rounded-md shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-2">
            {new Date(log.createdAt).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {log.activities.map((a) => (
              <span
                key={a}
                className="text-xs bg-orange-50 text-orange-700 rounded-full px-3 py-1"
              >
                {a}
              </span>
            ))}
          </div>
          {log.notes && <p className="text-sm text-gray-600">{log.notes}</p>}
        </div>
      ))}
    </div>
  );
}

export default function ParentBreakActivitiesPage() {
  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Break Time Activities
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        What your child did during break time at school.
      </p>

      <SecureContentGate subject="Break Time Activities">
        <BreakActivityContent />
      </SecureContentGate>
    </FamilyDashboardLayout>
  );
}
