"use client";

import { useEffect, useState } from "react";
import { openAuthenticatedFile } from "@/lib/fileAccess";

import { API_BASE } from "@/lib/config";
interface InboxMessage {
  _id: string;
  sender: { _id: string; name: string; role: string } | null;
  category: string;
  body: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  child: "Student",
  parent: "Parent",
  shadow_teacher: "Shadow Teacher",
  principal: "Principal",
  admin: "Admin",
};

export default function MessageInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reply state — keyed by the message being replied to.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyCategory, setReplyCategory] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<Record<string, string>>({});

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [messagesRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/messages/inbox`, { headers: authHeaders() }),
          fetch(`${API_BASE}/messages/categories`, {
            headers: authHeaders(),
          }),
        ]);
        const messagesData = await messagesRes.json();
        const categoriesData = await categoriesRes.json();

        if (messagesData.success) {
          setMessages(messagesData.messages);
        } else {
          setError(messagesData.message || "Could not load messages");
        }
        if (categoriesData.success) setCategories(categoriesData.categories);
      } catch (err) {
        console.error("Failed to load inbox", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const startReply = (message: InboxMessage) => {
    setReplyingTo(message._id);
    setReplyCategory(message.category);
    setReplyBody("");
    setReplyFile(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyBody("");
    setReplyFile(null);
  };

  const sendReply = async (message: InboxMessage) => {
    if (!message.sender) return;
    if (!replyBody.trim()) {
      setReplyStatus((s) => ({ ...s, [message._id]: "Write a reply first." }));
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("recipientId", message.sender._id);
      formData.append("category", replyCategory || message.category);
      formData.append("body", replyBody);
      if (replyFile) formData.append("attachment", replyFile);

      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setReplyStatus((s) => ({ ...s, [message._id]: "Reply sent." }));
        setReplyingTo(null);
        setReplyBody("");
        setReplyFile(null);
      } else {
        setReplyStatus((s) => ({
          ...s,
          [message._id]: data.message || "Could not send reply.",
        }));
      }
    } catch (err) {
      console.error("Failed to send reply", err);
      setReplyStatus((s) => ({
        ...s,
        [message._id]: "Unable to reach the server.",
      }));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm divide-y divide-gray-50">
      {messages.map((m) => (
        <div key={m._id} className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800">
              {m.sender?.name || "Unknown"}{" "}
              <span className="text-xs font-normal text-gray-400">
                ({ROLE_LABELS[m.sender?.role || ""] || m.sender?.role})
              </span>
            </p>
            <p className="text-xs text-gray-400">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="inline-block text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mb-2">
            {m.category}
          </span>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {m.body}
          </p>
          {m.attachmentPath && (
            <button
              type="button"
              onClick={() =>
                openAuthenticatedFile(`${API_BASE}/messages/${m._id}/attachment`)
              }
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
            >
              📎 {m.attachmentName || "Attachment"}
            </button>
          )}

          {m.sender && (
            <div className="mt-3">
              {replyingTo === m._id ? (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <select
                    value={replyCategory}
                    onChange={(e) => setReplyCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-xs mb-2 outline-none focus:border-sky-400"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    placeholder="Write your reply..."
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm mb-2 outline-none focus:border-sky-400"
                  />
                  <input
                    type="file"
                    onChange={(e) =>
                      setReplyFile(e.target.files?.[0] || null)
                    }
                    className="text-xs mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendReply(m)}
                      disabled={sending}
                      className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-xs font-medium px-4 py-1.5 rounded disabled:opacity-60"
                    >
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                    <button
                      onClick={cancelReply}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startReply(m)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Reply
                </button>
              )}
              {replyStatus[m._id] && replyingTo !== m._id && (
                <p className="text-xs text-gray-400 mt-1">
                  {replyStatus[m._id]}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
