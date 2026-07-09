"use client";

import { useState } from "react";
import MessageComposeForm from "./MessageComposeForm";
import MessageInbox from "./MessageInbox";
import MessageSentList from "./MessageSentList";

type Tab = "compose" | "inbox" | "sent";

export default function MessagesPanel({
  showCompose = false,
}: {
  showCompose?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(showCompose ? "compose" : "inbox");

  const tabs: { key: Tab; label: string }[] = [
    ...(showCompose ? [{ key: "compose" as Tab, label: "Compose" }] : []),
    { key: "inbox", label: "Inbox" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-sky-300 text-gray-900"
                : "bg-sky-100 text-gray-700 hover:bg-sky-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compose" && <MessageComposeForm />}
      {tab === "inbox" && <MessageInbox />}
      {tab === "sent" && <MessageSentList />}
    </div>
  );
}
