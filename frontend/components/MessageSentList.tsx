"use client";

import { useEffect, useState } from "react";

interface SentMessage {
  _id: string;
  recipient: { name: string; role: string } | null;
  category: string;
  body: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  read: boolean;
  createdAt: string;
}

const API_BASE = "http://localhost:5000/api";
const FILE_BASE = "http://localhost:5000";

const ROLE_LABELS: Record<string, string> = {
  child: "Student",
  parent: "Parent",
  shadow_teacher: "Shadow Teacher",
  principal: "Principal",
  admin: "Admin",
};

export default function MessageSentList() {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/messages/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        } else {
          setError(data.message || "Could not load sent messages");
        }
      } catch (err) {
        console.error("Failed to load sent messages", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
        No messages sent yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm divide-y divide-gray-50">
      {messages.map((m) => (
        <div key={m._id} className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800">
              To: {m.recipient?.name || "Unknown"}{" "}
              <span className="text-xs font-normal text-gray-400">
                ({ROLE_LABELS[m.recipient?.role || ""] || m.recipient?.role})
              </span>
            </p>
            <p className="text-xs text-gray-400">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {m.category}
            </span>
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                m.read
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-gray-500 bg-gray-100"
              }`}
            >
              {m.read ? "Read" : "Sent"}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {m.body}
          </p>
          {m.attachmentPath && (
            <a
              href={`${FILE_BASE}/${m.attachmentPath.replace(/\\/g, "/")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
            >
              📎 {m.attachmentName || "Attachment"}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
