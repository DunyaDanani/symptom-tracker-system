"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";

interface AlertItem {
  _id: string;
  type: "symptom_frequency" | "low_emotion_score" | "manual_flag";
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: { name: string } | null;
  acknowledgedAt?: string | null;
  createdAt: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    grade?: string;
    section?: string;
    branch?: string;
  } | null;
}

const TYPE_LABEL: Record<AlertItem["type"], string> = {
  symptom_frequency: "Symptom frequency",
  low_emotion_score: "Low emotion score",
  manual_flag: "Manual flag",
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [status, setStatus] = useState<"open" | "all">("open");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (nextStatus: "open" | "all", nextBranch: string) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const params = new URLSearchParams({ status: nextStatus });
      if (nextBranch) params.set("branch", nextBranch);
      const res = await fetch(`${API_BASE}/staff/alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAlerts(data.alerts);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/students/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBranches(data.branches);
      })
      .catch((err) => console.error("Failed to load branches", err));
  }, []);

  useEffect(() => {
    load(status, branch);
  }, [status, branch]);

  const acknowledge = async (id: string) => {
    const token = localStorage.getItem("token");
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/staff/alerts/${id}/acknowledge`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        if (status === "open") {
          setAlerts((prev) => prev.filter((a) => a._id !== id));
        } else {
          setAlerts((prev) =>
            prev.map((a) => (a._id === id ? { ...a, ...data.alert } : a))
          );
        }
      }
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <BackButton />
      <div className="flex items-center justify-between mt-2 mb-8 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-blue-900">Alerts</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 outline-none focus:border-blue-400 bg-white text-gray-700"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="flex gap-2 bg-white rounded-md border border-gray-200 p-1">
            <button
              onClick={() => setStatus("open")}
              className={`px-4 py-1.5 text-sm rounded ${
                status === "open"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-slate-50"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatus("all")}
              className={`px-4 py-1.5 text-sm rounded ${
                status === "all"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Student</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Detail</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Raised</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-gray-400 text-center">
                  Loading...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-gray-400 text-center">
                  {status === "open" ? "No open alerts." : "No alerts yet."}
                  {branch ? ` for ${branch}.` : ""}
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert._id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                      {TYPE_LABEL[alert.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {alert.student ? (
                      <>
                        <Link
                          href={`/dashboard/admin/students/${alert.student._id}/history`}
                          className="text-blue-600 hover:underline"
                        >
                          {alert.student.firstName} {alert.student.lastName}
                        </Link>
                        {alert.student.branch && (
                          <p className="text-xs text-gray-400">{alert.student.branch}</p>
                        )}
                      </>
                    ) : (
                      "Unknown student"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{alert.message}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(alert.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {alert.acknowledged ? (
                      <div>
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                          Acknowledged
                        </span>
                        {alert.acknowledgedBy && (
                          <p className="text-xs text-gray-400">
                            by {alert.acknowledgedBy.name}
                          </p>
                        )}
                        {alert.acknowledgedAt && (
                          <p className="text-xs text-gray-400">
                            {new Date(alert.acknowledgedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledge(alert._id)}
                        disabled={busyId === alert._id}
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {busyId === alert._id ? "Acknowledging..." : "Acknowledge"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
 