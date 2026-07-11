"use client";

import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/config";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  principal: "Principal",
  shadow_teacher: "Shadow Teacher",
  class_teacher: "Class Teacher",
  parent: "Parent",
  child: "Student",
};

interface NoticeEntry {
  _id: string;
  title: string;
  body: string;
  postedBy: { _id: string; name: string } | null;
  postedByRole: string;
  branch?: string | null;
  createdAt: string;
}

// Shared school-wide announcement board. Admin and Principal get a compose
// form (canPost=true); every role sees the same read-only feed below it,
// since notices go out to the whole school regardless of who posted them.
export default function NoticeBoard({ canPost }: { canPost: boolean }) {
  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    setCurrentRole(localStorage.getItem("role"));

    // The token isn't encrypted, just signed — decode the payload to read
    // the user id (no separate "userId" key is stored at login).
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id || null);
      } catch (err) {
        console.error("Failed to decode token", err);
      }
    }
  }, []);

  const loadNotices = async () => {
    try {
      const res = await fetch(`${API_BASE}/notices`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
      } else {
        setError(data.message || "Could not load notices");
      }
    } catch (err) {
      console.error("Failed to load notices", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setPostError("Please fill in both the title and the notice text.");
      return;
    }

    setPosting(true);
    setPostError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/notices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setBody("");
        setSuccessMsg("Notice posted successfully");
        setNotices((prev) => [data.notice, ...prev]);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setPostError(data.message || "Could not post notice");
      }
    } catch (err) {
      console.error("Failed to post notice", err);
      setPostError("Unable to reach the server");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/notices/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setNotices((prev) => prev.filter((n) => n._id !== id));
      } else {
        setError(data.message || "Could not delete notice");
      }
    } catch (err) {
      console.error("Failed to delete notice", err);
      setError("Unable to reach the server");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {canPost && (
        <form
          onSubmit={handlePost}
          className="bg-white rounded-md shadow-sm p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-800">
            Post a Notice
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Half-term break schedule"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Notice Text
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write the notice here..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {postError && (
            <p className="text-red-500 text-sm">{postError}</p>
          )}
          {successMsg && (
            <p className="text-green-600 text-sm">{successMsg}</p>
          )}

          <button
            type="submit"
            disabled={posting}
            className="bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-sm rounded-full px-5 py-2"
          >
            {posting ? "Posting..." : "Post Notice"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          School Notices
        </h2>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : notices.length === 0 ? (
          <p className="text-gray-400 text-sm">No notices yet.</p>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => {
              const canDelete =
                currentRole === "admin" ||
                currentRole === "cao" ||
                (currentRole === "principal" &&
                  notice.postedBy?._id === currentUserId);

              return (
                <div
                  key={notice._id}
                  className="border border-gray-100 rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-blue-900">
                      {notice.title}
                    </h3>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(notice._id)}
                        disabled={deletingId === notice._id}
                        className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 shrink-0"
                      >
                        {deletingId === notice._id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                    {notice.body}
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                    <span>
                      Posted by {notice.postedBy?.name || "Unknown"} (
                      {ROLE_LABELS[notice.postedByRole] ||
                        notice.postedByRole}
                      )
                    </span>
                    {notice.branch && (
                      <span className="bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">
                        {notice.branch}
                      </span>
                    )}
                    <span>·</span>
                    <span>{new Date(notice.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
