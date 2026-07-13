"use client";

import { useEffect, useState } from "react";
import { openAuthenticatedFile } from "@/lib/fileAccess";
import {
  ChevronIcon,
  BookIcon,
  PaperclipIcon,
  PencilIcon,
  TrashIcon,
  UploadIcon,
  type ModuleSubjectGroup,
  type PastPaperSubjectGroup,
} from "@/components/SubjectResourceGrid";
import { API_BASE } from "@/lib/config";

// The single-subject page a user lands on after clicking a subject card in
// StudyModuleContent. Fetches the same full module/past-paper listing as
// the grid page (cheap enough for this data size) and renders just the one
// subject's topics/files — a real page/URL per subject rather than an
// in-place accordion, so back/forward and direct links behave normally.
//
// For modules, each topic also carries the child/parent's own submissions
// for that topic — submitting completed work happens right there, next to
// the module files it answers, rather than in a separate section.
export default function SubjectDetailContent({
  type,
  subject,
}: {
  type: "module" | "pastPaper";
  subject: string;
}) {
  const [modules, setModules] = useState<ModuleSubjectGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperSubjectGroup[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTopic, setOpenTopic] = useState<Record<string, boolean>>({});

  // Submission upload — keyed by topic name so each topic's file picker
  // and error state are independent of the others.
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File | null>>({});
  const [uploadingTopic, setUploadingTopic] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Inline edit (replace file) for whichever submission row is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    try {
      const linkedRes = await fetch(`${API_BASE}/students/linked`, {
        headers: authHeaders(),
      });
      const linkedData = await linkedRes.json();
      if (!linkedData.success) {
        setError(linkedData.message || "Could not load the linked profile");
        return;
      }
      setStudentId(linkedData.student._id);

      const res = await fetch(
        `${API_BASE}/study-modules/student/${linkedData.student._id}`,
        { headers: authHeaders() }
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTopic = (key: string) => {
    setOpenTopic((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmissionUpload = async (
    e: React.FormEvent,
    topic: string
  ) => {
    e.preventDefault();
    setUploadErrors((prev) => ({ ...prev, [topic]: "" }));

    const file = submissionFiles[topic];
    if (!file) {
      setUploadErrors((prev) => ({ ...prev, [topic]: "Choose a file to upload." }));
      return;
    }

    setUploadingTopic(topic);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("type", "submission");
      formData.append("subject", subject);
      formData.append("topic", topic);
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/study-modules`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionFiles((prev) => ({ ...prev, [topic]: null }));
        await load();
      } else {
        setUploadErrors((prev) => ({ ...prev, [topic]: data.message || "Upload failed." }));
      }
    } catch (err) {
      console.error("Failed to upload submission", err);
      setUploadErrors((prev) => ({ ...prev, [topic]: "Unable to reach the server." }));
    } finally {
      setUploadingTopic(null);
    }
  };

  const startEdit = (id: string) => {
    setEditingId(id);
    setEditFile(null);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFile(null);
    setEditError("");
  };

  const saveEdit = async (id: string) => {
    if (!editFile) {
      setEditError("Choose a replacement file first.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("file", editFile);

      const res = await fetch(`${API_BASE}/study-modules/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        cancelEdit();
        await load();
      } else {
        setEditError(data.message || "Could not update this submission.");
      }
    } catch (err) {
      console.error("Failed to edit submission", err);
      setEditError("Unable to reach the server.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/study-modules/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await load();
    } catch (err) {
      console.error("Failed to delete submission", err);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  if (type === "pastPaper") {
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

  // Modules — each topic shows the teacher's files plus this account's own
  // submissions for that topic, with an upload box to turn in new work.
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
                    <div className="p-3 space-y-4">
                      {t.files.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No files from your teacher yet.
                        </p>
                      ) : (
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
                              className="flex items-center gap-2 px-1 py-2 text-sm text-gray-700 hover:text-blue-700 w-full text-left"
                            >
                              <BookIcon className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="truncate">{f.fileName}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="bg-gray-50 rounded-md p-3">
                        <h3 className="text-xs font-semibold text-gray-600 mb-2">
                          Your Submissions
                        </h3>

                        {t.submissions.length === 0 ? (
                          <p className="text-xs text-gray-400 mb-3">
                            You haven't submitted anything for this topic yet.
                          </p>
                        ) : (
                          <div className="space-y-1.5 mb-3">
                            {t.submissions.map((f) => (
                              <div key={f._id} className="rounded-md bg-white px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAuthenticatedFile(
                                        `${API_BASE}/study-modules/${f._id}/file`
                                      )
                                    }
                                    className="flex items-center gap-2 text-sm text-blue-700 hover:underline text-left truncate"
                                  >
                                    <PaperclipIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="truncate">{f.fileName}</span>
                                  </button>

                                  {f.isOwner && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(f._id)}
                                        className="text-gray-300 hover:text-blue-600 transition-colors"
                                        aria-label="Edit submission"
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(f._id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                        aria-label="Delete submission"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {editingId === f._id && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col gap-2">
                                    <input
                                      type="file"
                                      onChange={(e) =>
                                        setEditFile(e.target.files?.[0] || null)
                                      }
                                      className="text-xs"
                                    />
                                    {editError && (
                                      <p className="text-xs text-red-500">{editError}</p>
                                    )}
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(f._id)}
                                        disabled={savingEdit}
                                        className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded disabled:opacity-60"
                                      >
                                        {savingEdit ? "Saving..." : "Replace File"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <form onSubmit={(e) => handleSubmissionUpload(e, t.topic)}>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="file"
                              onChange={(e) =>
                                setSubmissionFiles((prev) => ({
                                  ...prev,
                                  [t.topic]: e.target.files?.[0] || null,
                                }))
                              }
                              className="flex-1 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={uploadingTopic === t.topic}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded disabled:opacity-60 flex items-center justify-center gap-1.5 shrink-0"
                            >
                              <UploadIcon className="w-3.5 h-3.5" />
                              {uploadingTopic === t.topic ? "Uploading..." : "Submit Work"}
                            </button>
                          </div>
                          {uploadErrors[t.topic] && (
                            <p className="text-xs text-red-500 mt-2">
                              {uploadErrors[t.topic]}
                            </p>
                          )}
                        </form>
                      </div>
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
