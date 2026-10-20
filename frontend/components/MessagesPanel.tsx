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
  // Inbox first — reading is the most common task — and Create last.
  const [tab, setTab] = useState<Tab>("inbox");

  const tabs: { key: Tab; label: string }[] = [
    { key: "inbox", label: "Inbox" },
    { key: "sent", label: "Sent" },
    ...(showCompose ? [{ key: "compose" as Tab, label: "Create Message" }] : []),
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-10 px-5 rounded text-sm font-medium transition-colors border ${
              tab === t.key
                ? "bg-blue-900 border-blue-900 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
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
