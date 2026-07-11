"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { API_BASE } from "@/lib/config";

interface AlertItem {
  _id: string;
  type: "symptom_frequency" | "low_emotion_score" | "manual_flag";
  message: string;
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

// Single combined bell for admins: FR-10 threshold alerts + unread
// messages, both shown as one badge count with a two-section dropdown.
export default function AlertsNotificationsBell({
  messagesHref,
}: {
  messagesHref: string;
}) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // FR-10: real push notifications, not just the in-app badge. Tracks
  // which open-alert IDs we've already surfaced so a fresh browser
  // Notification only fires for alerts that are actually new since the
  // last poll — the first load (seenAlertIds === null) just primes this
  // set without notifying, so an admin isn't bombarded with every
  // already-open alert the moment they log in.
  const seenAlertIds = useRef<Set<string> | null>(null);

  const notifyNewAlerts = (nextAlerts: AlertItem[]) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const nextIds = new Set(nextAlerts.map((a) => a._id));

    if (seenAlertIds.current === null) {
      seenAlertIds.current = nextIds;
      return;
    }

    const isNew = (a: AlertItem) => !seenAlertIds.current!.has(a._id);
    const freshAlerts = nextAlerts.filter(isNew);
    seenAlertIds.current = nextIds;

    if (freshAlerts.length === 0 || Notification.permission !== "granted") {
      return;
    }

    freshAlerts.forEach((alert) => {
      const studentName = alert.student
        ? `${alert.student.firstName} ${alert.student.lastName}`
        : "A student";
      const notification = new Notification(
        `${TYPE_LABEL[alert.type]} alert`,
        {
          body: `${studentName}: ${alert.message}`,
          tag: alert._id,
        }
      );
      notification.onclick = () => {
        window.focus();
        setOpen(true);
        notification.close();
      };
    });
  };

  const loadAlerts = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/staff/alerts?status=open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
        notifyNewAlerts(data.alerts);
      }
    } catch (err) {
      console.error("Failed to load alerts", err);
    }
  };

  const loadMessageCount = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMessageCount(data.count);
    } catch (err) {
      console.error("Failed to load unread count", err);
    }
  };

  useEffect(() => {
    // Ask once per session — browsers remember the answer, and we don't
    // want to re-prompt if the admin already dismissed or denied it.
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }

    loadAlerts();
    loadMessageCount();
    // Poll every 30s so admins see new threshold breaches / messages
    // without a refresh — each new open alert also fires a real browser
    // notification (see notifyNewAlerts), not just this badge count.
    const interval = setInterval(() => {
      loadAlerts();
      loadMessageCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        setAlerts((prev) => prev.filter((a) => a._id !== id));
      }
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    } finally {
      setBusyId(null);
    }
  };

  const totalCount = alerts.length + messageCount;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        title="Alerts & Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative text-white hover:opacity-80 transition-opacity"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 17a1.5 1.5 0 003 0h-3z" />
        </svg>
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 max-h-[32rem] overflow-y-auto bg-white rounded-md shadow-lg border border-gray-100 z-50 text-gray-800">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold">Alerts & Notifications</p>
          </div>

          {/* Alerts section */}
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Alerts
              </p>
              <Link
                href="/dashboard/admin/alerts"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                View all →
              </Link>
            </div>

            {alerts.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-gray-400">
                No open alerts.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {alerts.map((alert) => (
                  <li key={alert._id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                          {TYPE_LABEL[alert.type]}
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {alert.student
                            ? `${alert.student.firstName} ${alert.student.lastName}`
                            : "Unknown student"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {alert.message}
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledge(alert._id)}
                        disabled={busyId === alert._id}
                        className="text-xs text-blue-600 hover:underline shrink-0 disabled:opacity-50"
                      >
                        {busyId === alert._id ? "..." : "Dismiss"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Messages section */}
          <div className="border-t border-gray-100">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Messages
              </p>
              <Link
                href={messagesHref}
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                View all →
              </Link>
            </div>
            <p className="px-4 pb-3 text-sm text-gray-600">
              {messageCount === 0
                ? "No unread messages."
                : `${messageCount} unread message${messageCount !== 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
