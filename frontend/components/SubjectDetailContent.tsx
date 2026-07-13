"use client";

import { useEffect, useState } from "react";
import { openAuthenticatedFile } from "@/lib/fileAccess";
import {
  ChevronIcon,
  BookIcon,
  PaperclipIcon,
  type ModuleSubjectGroup,
  type PastPaperSubjectGroup,
} from "@/components/SubjectResourceGrid";
import { API_BASE } from "@/lib/config";

// The single-subject page a user lands on after clicking a subject card in
// StudyModuleContent. Fetches the same full module/past-paper listing as
// the grid page (cheap enough for this data size) and renders just the one
// subject's topics/files — a real page/URL per subject rather than an
// in-place accordion, so back/forward and direct links behave normally.
export default function SubjectDetailContent({
  type,
  subject,
}: {
  type: "module" | "pastPaper";
  subject: string;
}) {
  const [modules, setModules] = useState<ModuleSubjectGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperSubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTopic, setOpenTopic] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const authHeaders = { Authorization: `Bearer ${token}` };

      try {
        const linkedRes = await fetch(`${API_BASE}/students/linked`, {
          headers: authHeaders,
        });
        const linkedData = await linkedRes.json();
        if (!linkedData.success) {
          setError(linkedData.message || "Could not load the linked profile");
          return;
        }

        const res = await fetch(
          `${API_BASE}/study-modules/student/${linkedData.student._id}`,
          { headers: authHeaders }
        );
        const data = await res.json();
        if (data.success) {
          setModules(data.modules);
          setPastPapers(data.pastPapers);
        } else {
          setError(data.message || "Could not load study modules");
        }
      } catch (err) {
        console.error("Failed to load study modules", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleTopic = (key: string) => {
    setOpenTopic((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  if (type === "module") {
    const group = modules.find((m) => m.subject === subject);

    return (
      <>
        <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
          {subject}
        </h1>

        <div className="bg-white border border-gray-100 rounded-md p-4">
          {!group || group.topics.length === 0 ? (
            <p className="text-xs text-gray-400">
              No modules in this subject yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {group.topics.map((t) => {
                const topicKey = t.topic;
                return (
                  <div
                    key={topicKey}
                    className="border border-gray-100 rounded-md overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTopic(topicKey)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <ChevronIcon
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                            openTopic[topicKey] ? "rotate-90" : ""
                          }`}
                        />
                        {t.topic}
                      </span>
                      <span className="text-xs text-gray-400">
                        {t.files.length} file{t.files.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {openTopic[topicKey] && (
                      <div className="divide-y divide-gray-50">
                        {t.files.map((f) => (
                          <button
                            type="button"
                            key={f._id}
                            onClick={() =>
                              openAuthenticatedFile(
                                `${API_BASE}/study-modules/${f._id}/file`
                              )
                            }
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 w-full text-left"
                          >
                            <BookIcon className="w-4 h-4 text-gray-400" />
                            {f.fileName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // Past papers — flat file list, no topic grouping.
  const group = pastPapers.find((p) => p.subject === subject);

  return (
    <>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        {subject} — Past Papers
      </h1>

      <div className="bg-white border border-gray-100 rounded-md p-4">
        {!group || group.files.length === 0 ? (
          <p className="text-xs text-gray-400">
            No past papers in this subject yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {group.files.map((f) => (
              <button
                type="button"
                key={f._id}
                onClick={() =>
                  openAuthenticatedFile(
                    `${API_BASE}/study-modules/${f._id}/file`
                  )
                }
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 w-full text-left"
              >
                <PaperclipIcon className="w-4 h-4 text-gray-400" />
                {f.fileName}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
