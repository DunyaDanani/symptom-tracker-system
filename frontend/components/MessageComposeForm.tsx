"use client";

import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/config";
interface Recipient {
  id: string;
  name: string;
  roleLabel: string;
}

// Groups recipients by role so the dropdown separates Admins / Branch
// Principals / Shadow Teachers / Parents with a header instead of one flat
// mixed list. roleLabel varies slightly depending on who's viewing it
// (e.g. admin sees "Principal (Wattala)", a parent sees "Branch Principal"
// for their own branch's principal) — this normalizes both into one group.
const ROLE_GROUP_ORDER = [
  "Admins",
  "Branch Principals",
  "Shadow Teachers",
  "Parents",
  "Other",
];

const getRoleGroup = (roleLabel: string): string => {
  if (roleLabel.startsWith("Admin")) return "Admins";
  if (roleLabel.startsWith("Principal") || roleLabel === "Branch Principal")
    return "Branch Principals";
  if (roleLabel.startsWith("Shadow Teacher")) return "Shadow Teachers";
  if (roleLabel.startsWith("Parent")) return "Parents";
  return "Other";
};

const groupRecipients = (recipients: Recipient[]) =>
  ROLE_GROUP_ORDER.map((group) => ({
    group,
    items: recipients
      .filter((r) => getRoleGroup(r.roleLabel) === group)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length > 0);

export default function MessageComposeForm() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  // Admin (and cao, which has identical permissions) gets a richer
  // filter + search picker instead of the plain dropdown — their
  // recipient list spans every branch principal, shadow teacher, and
  // parent school-wide, which is too long to scan as one flat list.
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("All");
  const [recipientSearch, setRecipientSearch] = useState("");

  useEffect(() => {
    setCurrentRole(localStorage.getItem("role"));
  }, []);

  const isAdmin = currentRole === "admin" || currentRole === "cao";

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [recipientsRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/messages/recipients`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE}/messages/categories`, {
            headers: authHeaders(),
          }),
        ]);

        const recipientsData = await recipientsRes.json();
        const categoriesData = await categoriesRes.json();

        if (recipientsData.success) setRecipients(recipientsData.recipients);
        else setError(recipientsData.message || "Could not load recipients");

        if (categoriesData.success) setCategories(categoriesData.categories);
      } catch (err) {
        console.error("Failed to load message form data", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    setSendSuccess(false);

    if (!recipientId || !category || !body) {
      setStatus("Select a recipient, a category, and write a message.");
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("recipientId", recipientId);
      formData.append("category", category);
      formData.append("body", body);
      if (file) formData.append("attachment", file);

      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setStatus("Message sent successfully");
        setSendSuccess(true);
        setRecipientId("");
        setCategory("");
        setBody("");
        setFile(null);
      } else {
        setSendSuccess(false);
        setStatus(data.message || "Could not send message.");
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setSendSuccess(false);
      setStatus("Unable to reach the server.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  const recipientGroups = groupRecipients(recipients);
  const selectedRecipient = recipients.find((r) => r.id === recipientId);

  const visibleRecipients = recipients
    .filter((r) => roleFilter === "All" || getRoleGroup(r.roleLabel) === roleFilter)
    .filter((r) =>
      r.name.toLowerCase().includes(recipientSearch.trim().toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form
      onSubmit={handleSend}
      className="bg-white rounded-md shadow-sm p-6 max-w-xl mx-auto"
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">
        01. Select Recipient
      </label>

      {isAdmin ? (
        <div className="mb-5">
          {/* Role filter tabs */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setRoleFilter("All")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                roleFilter === "All"
                  ? "bg-blue-900 text-white"
                  : "bg-slate-100 text-gray-600 hover:bg-slate-200"
              }`}
            >
              All ({recipients.length})
            </button>
            {recipientGroups.map(({ group, items }) => (
              <button
                type="button"
                key={group}
                onClick={() => setRoleFilter(group)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  roleFilter === group
                    ? "bg-blue-900 text-white"
                    : "bg-slate-100 text-gray-600 hover:bg-slate-200"
                }`}
              >
                {group} ({items.length})
              </button>
            ))}
          </div>

          {/* Name search */}
          <input
            type="text"
            placeholder="Search by name..."
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
          />

          {/* Scrollable recipient list */}
          <div className="border border-slate-200 rounded mt-2 max-h-56 overflow-y-auto">
            {visibleRecipients.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">
                No recipients match.
              </p>
            ) : (
              visibleRecipients.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRecipientId(r.id)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm transition-colors ${
                    recipientId === r.id
                      ? "bg-sky-100 text-sky-800 font-medium"
                      : "text-gray-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-gray-400">{r.roleLabel}</span>
                </button>
              ))
            )}
          </div>

          {selectedRecipient && (
            <p className="text-xs text-sky-700 mt-2">
              Selected: {selectedRecipient.name} ({selectedRecipient.roleLabel})
            </p>
          )}
        </div>
      ) : (
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-5 outline-none focus:border-sky-400"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          <option value="">Select a recipient</option>
          {recipientGroups.map(({ group, items }) => (
            <optgroup key={group} label={`${group} (${items.length})`}>
              {items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.roleLabel})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-1">
        02. Message Category
      </label>
      <div className="border border-slate-200 rounded mb-5 max-h-56 overflow-y-auto">
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategory(c)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              category === c
                ? "bg-sky-100 text-sky-800 font-medium"
                : "text-gray-700 hover:bg-slate-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        03. Type your message
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-5 outline-none focus:border-sky-400"
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">
        04. Upload attachment (Optional)
      </label>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-sm mb-5"
      />

      {status && (
        <p
          className={`text-sm mb-4 ${
            sendSuccess ? "text-green-600 font-medium" : "text-red-500"
          }`}
        >
          {status}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending}
          className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-6 py-2.5 rounded disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
