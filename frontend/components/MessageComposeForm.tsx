"use client";

import { useEffect, useState } from "react";

interface Recipient {
  id: string;
  name: string;
  roleLabel: string;
}

const API_BASE = "http://localhost:5000/api";

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
  const [sending, setSending] = useState(false);

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
        setStatus("Message sent.");
        setRecipientId("");
        setCategory("");
        setBody("");
        setFile(null);
      } else {
        setStatus(data.message || "Could not send message.");
      }
    } catch (err) {
      console.error("Failed to send message", err);
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

  return (
    <form
      onSubmit={handleSend}
      className="bg-white rounded-md shadow-sm p-6 max-w-xl"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-medium text-gray-800">
          Create Message
        </h2>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        01. Select Recipient
      </label>
      <select
        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-5 outline-none focus:border-sky-400"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
      >
        <option value="">Select a recipient</option>
        {recipients.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} ({r.roleLabel})
          </option>
        ))}
      </select>

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

      {status && <p className="text-xs text-gray-500 mb-4">{status}</p>}

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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
