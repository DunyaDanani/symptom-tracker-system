"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { API_BASE } from "@/lib/config";
import { BTN_SECONDARY } from "@/lib/ui";

// Header bell for every role. One badge (the total of everything new) and a
// dropdown with three separate sections:
//   Alerts   — open "needs attention" alerts the user may see (admin: all,
//              principal / class teacher: their branch, shadow teacher:
//              their students, parent: their child). Admins can dismiss.
//   Notices  — notices posted since the user last opened the notice board.
//   Messages — unread messages, newest first (peeking here doesn't mark
//              them read; opening Messages does).
// Refreshes every 30 seconds. New alerts also raise a browser notification
// when the user has allowed them.

interface AlertItem {
  _id: string;
  type: "symptom_frequency" | "low_emotion_score" | "manual_flag";
  message: string;
  createdAt: string;
  student: { _id: string; fullName: string } | null;
}

interface NoticeItem {
  _id: string;
  title: string;
  createdAt: string;
  postedBy?: { name: string } | null;
}

interface MessageItem {
  _id: string;
  sender: string;
  category: string;
  preview: string;
  createdAt: string;
}

const TYPE_LABEL: Record<AlertItem["type"], string> = {
  symptom_frequency: "Symptom frequency",
  low_emotion_score: "Low emotion score",
  manual_flag: "Flagged for attention",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default function NotificationsBell({
  basePath,
  alertsHref,
}: {
  /** The role's dashboard root, e.g. "/dashboard/principal". */
  basePath: string;
  /** Where "View all" for alerts goes; omit to hide the link. */
  alertsHref?: string;
}) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [canDismiss, setCanDismiss] = useState(false);
  const [notices, setNotices] = useState<{ count: number; latest: NoticeItem[] }>({ count: 0, latest: [] });
  const [messages, setMessages] = useState<{ count: number; latest: MessageItem[] }>({ count: 0, latest: [] });
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seenAlertIds = useRef<Set<string> | null>(null);

  const get = async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.json();
  };

  // Browser notification for alerts that are new since the last refresh
  // (the first load only records what's already there).
  const notifyNewAlerts = (next: AlertItem[]) => {
    const nextIds = new Set(next.map((a) => a._id));
    if (seenAlertIds.current === null) {
      seenAlertIds.current = nextIds;
      return;
    }
    const fresh = next.filter((a) => !seenAlertIds.current!.has(a._id));
    seenAlertIds.current = nextIds;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (fresh.length === 0 || Notification.permission !== "granted") return;
    fresh.forEach((a) => {
      const n = new Notification(`${TYPE_LABEL[a.type]} alert`, {
        body: `${a.student?.fullName || "A student"}: ${a.message}`,
        tag: a._id,
      });
      n.onclick = () => {
        window.focus();
        setOpen(true);
        n.close();
      };
    });
  };

  const loadAll = async () => {
    try {
      const [a, n, m] = await Promise.all([
        get("/alerts/mine"),
        get("/notices/unread"),
        get("/messages/unread-preview"),
      ]);
      if (a.success) {
        setAlerts(a.alerts);
        setCanDismiss(Boolean(a.canDismiss));
        notifyNewAlerts(a.alerts);
      }
      if (n.success) setNotices({ count: n.count, latest: n.latest });
      if (m.success) setMessages({ count: m.count, latest: m.latest });
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load / sync from browser storage or loaded data
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismiss = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/staff/alerts/${id}/acknowledge`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    } finally {
      setBusyId(null);
    }
  };

  const total = alerts.length + notices.count + messages.count;

  const sectionHead = (label: string, count: number, href?: string) => (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
        {count > 0 && (
          <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold normal-case tracking-normal">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </p>
      {href && (
        <Link href={href} className={BTN_SECONDARY} onClick={() => setOpen(false)}>
          View all →
        </Link>
      )}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        title="Alerts & Notifications"
        aria-label={`Alerts and notifications${total ? `, ${total} new` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative text-white hover:opacity-80 transition-opacity"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 17a1.5 1.5 0 003 0h-3z" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] max-h-[34rem] overflow-y-auto bg-white rounded-md shadow-lg border border-gray-100 z-50 text-gray-800">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold">Alerts & Notifications</p>
          </div>

          {/* Alerts */}
          <div>
            {sectionHead("Alerts", alerts.length, alertsHref)}
            {alerts.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-gray-400">No open alerts.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {alerts.slice(0, 5).map((a) => (
                  <li key={a._id} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                        {TYPE_LABEL[a.type]}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">{a.student?.fullName || "Unknown student"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>
                    </div>
                    {canDismiss && (
                      <button
                        type="button"
                        onClick={() => dismiss(a._id)}
                        disabled={busyId === a._id}
                        className={`${BTN_SECONDARY} shrink-0`}
                      >
                        {busyId === a._id ? "..." : "Dismiss"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notices */}
          <div className="border-t border-gray-100">
            {sectionHead("Notices", notices.count, `${basePath}/notice`)}
            {notices.count === 0 ? (
              <p className="px-4 pb-3 text-sm text-gray-400">No new notices.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notices.latest.map((n) => (
                  <li key={n._id}>
                    <Link
                      href={`${basePath}/notice`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-gray-50"
                    >
                      <p className="text-sm text-gray-800 font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.postedBy?.name ? `${n.postedBy.name} · ` : ""}
                        {when(n.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Messages */}
          <div className="border-t border-gray-100">
            {sectionHead("Messages", messages.count, `${basePath}/messages`)}
            {messages.count === 0 ? (
              <p className="px-4 pb-3 text-sm text-gray-400">No unread messages.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {messages.latest.map((m) => (
                  <li key={m._id}>
                    <Link
                      href={`${basePath}/messages`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-gray-50"
                    >
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{m.sender}</span>
                        <span className="text-gray-400"> · {m.category}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.preview}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{when(m.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
