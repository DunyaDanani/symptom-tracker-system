"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import BackButton from "@/components/BackButton";
import { SUBJECTS } from "@/lib/subjects";
import { openAuthenticatedFile } from "@/lib/fileAccess";
import { API_BASE } from "@/lib/config";

interface StudentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  grade: string;
  section?: string;
}

interface ResourceFile {
  _id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  subject?: string;
  topic?: string;
  isOwner?: boolean;
  uploadedByRole?: string;
}

interface TopicGroup {
  topic: string;
  files: ResourceFile[];
  submissions: ResourceFile[];
}

interface ModuleSubjectGroup {
  subject: string;
  topics: TopicGroup[];
}

interface PastPaperSubjectGroup {
  subject: string;
  files: ResourceFile[];
}

interface BreakActivityEntry {
  _id: string;
  activities: string[];
  notes?: string;
  createdAt: string;
}

type Tab = "modules" | "pastPapers" | "breakActivities";

const TABS: { key: Tab; label: string }[] = [
  { key: "modules", label: "Modules" },
  { key: "pastPapers", label: "Past Papers" },
  { key: "breakActivities", label: "Break-Time Activities" },
];

export default function TeacherUploadModulesWorkspacePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [tab, setTab] = useState<Tab>("modules");

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [modules, setModules] = useState<ModuleSubjectGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperSubjectGroup[]>([]);
  const [openSubject, setOpenSubject] = useState<Record<string, boolean>>({});
  const [openTopic, setOpenTopic] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline edit (replace file / rename topic / move subject) for whichever
  // module or past-paper file is currently being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<string>(SUBJECTS[0]);
  const [editTopic, setEditTopic] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [moduleSubject, setModuleSubject] = useState<string>(SUBJECTS[0]);
  const [newTopic, setNewTopic] = useState("");
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [moduleUploading, setModuleUploading] = useState(false);
  const [moduleError, setModuleError] = useState("");

  const [pastPaperSubject, setPastPaperSubject] = useState<string>(SUBJECTS[0]);
  const [pastPaperFile, setPastPaperFile] = useState<File | null>(null);
  const [pastPaperUploading, setPastPaperUploading] = useState(false);
  const [pastPaperError, setPastPaperError] = useState("");

  // Break-time activity logging
  const [breakOptions, setBreakOptions] = useState<string[]>([]);
  const [selectedBreakActivities, setSelectedBreakActivities] = useState<
    string[]
  >([]);
  const [breakNotes, setBreakNotes] = useState("");
  const [breakHistory, setBreakHistory] = useState<BreakActivityEntry[]>([]);
  const [savingBreak, setSavingBreak] = useState(false);
  const [breakStatus, setBreakStatus] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const loadStudent = async () => {
    try {
      const res = await fetch(`${API_BASE}/teacher/students`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const found = data.students.find(
          (s: StudentSummary) => s._id === studentId
        );
        setStudent(found || null);
        if (!found) setError("This student is not assigned to you");
      }
    } catch (err) {
      console.error("Failed to load student", err);
    }
  };

  const loadResources = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/study-modules/student/${studentId}`,
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

  const loadBreakHistory = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/teacher/students/${studentId}/break-activities`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) setBreakHistory(data.logs);
    } catch (err) {
      console.error("Failed to load break activity history", err);
    }
  };

  useEffect(() => {
    loadStudent();
    loadResources();

    const loadBreakOptions = async () => {
      try {
        const res = await fetch(`${API_BASE}/teacher/break-activity-options`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) setBreakOptions(data.options);
      } catch (err) {
        console.error("Failed to load break activity options", err);
      }
    };
    loadBreakOptions();
    loadBreakHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const toggleSubject = (key: string) => {
    setOpenSubject((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTopic = (key: string) => {
    setOpenTopic((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleModuleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError("");

    if (!newTopic.trim()) {
      setModuleError("Enter a topic name.");
      return;
    }
    if (!moduleFile) {
      setModuleError("Choose a file to upload.");
      return;
    }

    setModuleUploading(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("type", "module");
      formData.append("subject", moduleSubject);
      formData.append("topic", newTopic.trim());
      formData.append("file", moduleFile);

      const res = await fetch(`${API_BASE}/study-modules`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setNewTopic("");
        setModuleFile(null);
        await loadResources();
      } else {
        setModuleError(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Failed to upload module", err);
      setModuleError("Unable to reach the server.");
    } finally {
      setModuleUploading(false);
    }
  };

  const handlePastPaperUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setPastPaperError("");

    if (!pastPaperFile) {
      setPastPaperError("Choose a file to upload.");
      return;
    }

    setPastPaperUploading(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("type", "pastPaper");
      formData.append("subject", pastPaperSubject);
      formData.append("file", pastPaperFile);

      const res = await fetch(`${API_BASE}/study-modules`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPastPaperFile(null);
        await loadResources();
      } else {
        setPastPaperError(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Failed to upload past paper", err);
      setPastPaperError("Unable to reach the server.");
    } finally {
      setPastPaperUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/study-modules/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await loadResources();
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  const startEdit = (f: ResourceFile) => {
    setEditingId(f._id);
    setEditSubject(f.subject || SUBJECTS[0]);
    setEditTopic(f.topic || "");
    setEditFile(null);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFile(null);
    setEditError("");
  };

  const saveEdit = async (id: string, isModule: boolean) => {
    if (isModule && !editTopic.trim()) {
      setEditError("Topic name is required.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("subject", editSubject);
      if (isModule) formData.append("topic", editTopic.trim());
      if (editFile) formData.append("file", editFile);

      const res = await fetch(`${API_BASE}/study-modules/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        cancelEdit();
        await loadResources();
      } else {
        setEditError(data.message || "Could not update this file.");
      }
    } catch (err) {
      console.error("Failed to edit file", err);
      setEditError("Unable to reach the server.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleBreakActivity = (activity: string) => {
    setSelectedBreakActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  const submitBreakActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setBreakStatus("");

    if (selectedBreakActivities.length === 0) {
      setBreakStatus("Select at least one activity.");
      return;
    }

    setSavingBreak(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/break-activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          studentId,
          activities: selectedBreakActivities,
          notes: breakNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBreakStatus("Break activity recorded.");
        setSelectedBreakActivities([]);
        setBreakNotes("");
        await loadBreakHistory();
      } else {
        setBreakStatus(data.message || "Could not save break activity.");
      }
    } catch (err) {
      console.error("Failed to submit break activity", err);
      setBreakStatus("Unable to reach the server.");
    } finally {
      setSavingBreak(false);
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-2xl font-semibold text-blue-900">Modules</h1>
        <BackButton />
      </div>
      {student && (
        <p className="text-sm text-gray-500 mb-6">
          {student.firstName} {student.lastName} · {student.grade}
          {student.section ? ` · ${student.section}` : ""}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 hover:bg-slate-100 border border-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          {tab === "modules" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload form */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Add file to Share
                </h2>

                <form onSubmit={handleModuleUpload}>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <select
                      value={moduleSubject}
                      onChange={(e) => setModuleSubject(e.target.value)}
                      className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="Topic name (e.g. Topic 1)"
                      className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
                    />
                  </div>

                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-rose-200 bg-rose-50/60 hover:bg-rose-50 transition-colors rounded-md py-10 cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => setModuleFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <UploadIcon className="w-9 h-9 text-gray-400" />
                    {moduleFile ? (
                      <span className="text-sm text-gray-700 font-medium">
                        {moduleFile.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Click to choose a file to upload
                      </span>
                    )}
                  </label>

                  {moduleError && (
                    <p className="text-xs text-red-500 mt-3">{moduleError}</p>
                  )}

                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={moduleUploading}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded disabled:opacity-60"
                    >
                      {moduleUploading ? "Uploading..." : "Add File"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Uploaded files */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Uploaded Files
                </h2>

                <div className="space-y-2">
                  {modules.map((group) => {
                    const key = `m::${group.subject}`;
                    const fileCount = group.topics.reduce(
                      (sum, t) => sum + t.files.length,
                      0
                    );
                    return (
                      <div key={key} className="rounded-md overflow-hidden">
                        <button
                          onClick={() => toggleSubject(key)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-left"
                        >
                          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <ChevronIcon
                              className={`w-3.5 h-3.5 text-blue-600 transition-transform ${
                                openSubject[key] ? "rotate-90" : ""
                              }`}
                            />
                            {group.subject}
                          </span>
                          <span className="text-xs text-gray-400">
                            {fileCount} file{fileCount !== 1 ? "s" : ""}
                          </span>
                        </button>

                        {openSubject[key] && (
                          <div className="pl-4 pt-2 space-y-1.5">
                            {group.topics.length === 0 ? (
                              <p className="text-xs text-gray-400 px-2 py-2">
                                No modules in this subject yet.
                              </p>
                            ) : (
                              group.topics.map((t) => {
                                const topicKey = `${key}::${t.topic}`;
                                return (
                                  <div key={topicKey} className="rounded-md overflow-hidden">
                                    <button
                                      onClick={() => toggleTopic(topicKey)}
                                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors text-left"
                                    >
                                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <ChevronIcon
                                          className={`w-3.5 h-3.5 text-blue-600 transition-transform ${
                                            openTopic[topicKey] ? "rotate-90" : ""
                                          }`}
                                        />
                                        {t.topic}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {t.files.length} file
                                        {t.files.length !== 1 ? "s" : ""}
                                      </span>
                                    </button>

                                    {openTopic[topicKey] && (
                                      <div className="pl-4 pt-1.5 space-y-1.5">
                                        {t.files.length === 0 ? (
                                          <p className="text-xs text-gray-400 px-2 py-2">
                                            No files uploaded for this topic yet.
                                          </p>
                                        ) : (
                                          t.files.map((f) => (
                                            <div
                                              key={f._id}
                                              className="px-3 py-2 bg-gray-100 rounded-md"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    openAuthenticatedFile(
                                                      `${API_BASE}/study-modules/${f._id}/file`
                                                    )
                                                  }
                                                  className="text-sm text-blue-700 hover:underline flex items-center gap-2 truncate"
                                                >
                                                  <BookIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                                  <span className="truncate">{f.fileName}</span>
                                                </button>
                                                {f.isOwner !== false && (
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                      onClick={() => startEdit(f)}
                                                      className="text-gray-300 hover:text-blue-600 transition-colors"
                                                      aria-label="Edit file"
                                                    >
                                                      <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDelete(f._id)}
                                                      className="text-gray-300 hover:text-red-500 transition-colors"
                                                      aria-label="Delete file"
                                                    >
                                                      <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>

                                              {editingId === f._id && (
                                                <EditFilePanel
                                                  isModule
                                                  editSubject={editSubject}
                                                  setEditSubject={setEditSubject}
                                                  editTopic={editTopic}
                                                  setEditTopic={setEditTopic}
                                                  setEditFile={setEditFile}
                                                  editError={editError}
                                                  savingEdit={savingEdit}
                                                  onCancel={cancelEdit}
                                                  onSave={() => saveEdit(f._id, true)}
                                                />
                                              )}
                                            </div>
                                          ))
                                        )}

                                        <div className="bg-gray-50 rounded-md p-2 mt-2">
                                          <h4 className="text-xs font-semibold text-gray-500 mb-1.5 px-1">
                                            Student Submissions
                                          </h4>
                                          {t.submissions.length === 0 ? (
                                            <p className="text-xs text-gray-400 px-1 py-1">
                                              Nothing submitted for this topic yet.
                                            </p>
                                          ) : (
                                            <div className="space-y-1.5">
                                              {t.submissions.map((f) => (
                                                <button
                                                  type="button"
                                                  key={f._id}
                                                  onClick={() =>
                                                    openAuthenticatedFile(
                                                      `${API_BASE}/study-modules/${f._id}/file`
                                                    )
                                                  }
                                                  className="flex items-center justify-between w-full px-2 py-1.5 bg-white rounded-md text-left"
                                                >
                                                  <span className="text-sm text-blue-700 hover:underline flex items-center gap-2 truncate">
                                                    <PaperclipIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                                    <span className="truncate">{f.fileName}</span>
                                                  </span>
                                                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                                                    {f.uploadedByRole === "parent" ? "Parent" : "Student"}
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "pastPapers" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload form */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Add Past Paper
                </h2>

                <form onSubmit={handlePastPaperUpload}>
                  <div className="mb-4">
                    <select
                      value={pastPaperSubject}
                      onChange={(e) => setPastPaperSubject(e.target.value)}
                      className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-rose-200 bg-rose-50/60 hover:bg-rose-50 transition-colors rounded-md py-10 cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) =>
                        setPastPaperFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                    <UploadIcon className="w-9 h-9 text-gray-400" />
                    {pastPaperFile ? (
                      <span className="text-sm text-gray-700 font-medium">
                        {pastPaperFile.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Click to choose a file to upload
                      </span>
                    )}
                  </label>

                  {pastPaperError && (
                    <p className="text-xs text-red-500 mt-3">{pastPaperError}</p>
                  )}

                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={pastPaperUploading}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded disabled:opacity-60"
                    >
                      {pastPaperUploading ? "Uploading..." : "Add Past Paper"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Uploaded files */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Uploaded Files
                </h2>

                <div className="space-y-2">
                  {pastPapers.map((group) => {
                    const key = `p::${group.subject}`;
                    return (
                      <div key={key} className="rounded-md overflow-hidden">
                        <button
                          onClick={() => toggleSubject(key)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-left"
                        >
                          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <ChevronIcon
                              className={`w-3.5 h-3.5 text-blue-600 transition-transform ${
                                openSubject[key] ? "rotate-90" : ""
                              }`}
                            />
                            {group.subject}
                          </span>
                          <span className="text-xs text-gray-400">
                            {group.files.length} file
                            {group.files.length !== 1 ? "s" : ""}
                          </span>
                        </button>

                        {openSubject[key] && (
                          <div className="pl-4 pt-2 space-y-1.5">
                            {group.files.length === 0 ? (
                              <p className="text-xs text-gray-400 px-2 py-2">
                                No past papers in this subject yet.
                              </p>
                            ) : (
                              group.files.map((f) => (
                                <div
                                  key={f._id}
                                  className="px-3 py-2 bg-gray-100 rounded-md"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAuthenticatedFile(
                                          `${API_BASE}/study-modules/${f._id}/file`
                                        )
                                      }
                                      className="text-sm text-blue-700 hover:underline flex items-center gap-2 truncate"
                                    >
                                      <PaperclipIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                      <span className="truncate">{f.fileName}</span>
                                    </button>
                                    {f.isOwner !== false && (
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          onClick={() => startEdit(f)}
                                          className="text-gray-300 hover:text-blue-600 transition-colors"
                                          aria-label="Edit file"
                                        >
                                          <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(f._id)}
                                          className="text-gray-300 hover:text-red-500 transition-colors"
                                          aria-label="Delete file"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {editingId === f._id && (
                                    <EditFilePanel
                                      isModule={false}
                                      editSubject={editSubject}
                                      setEditSubject={setEditSubject}
                                      editTopic={editTopic}
                                      setEditTopic={setEditTopic}
                                      setEditFile={setEditFile}
                                      editError={editError}
                                      savingEdit={savingEdit}
                                      onCancel={cancelEdit}
                                      onSave={() => saveEdit(f._id, false)}
                                    />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "breakActivities" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Logging form */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Log Break-Time Activity
                </h2>

                <form onSubmit={submitBreakActivity}>
                  <div className="flex flex-col gap-2 mb-4">
                    {breakOptions.map((activity) => (
                      <label
                        key={activity}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBreakActivities.includes(activity)}
                          onChange={() => toggleBreakActivity(activity)}
                          className="mt-0.5 rounded border-gray-300"
                        />
                        {activity}
                      </label>
                    ))}
                  </div>

                  <textarea
                    value={breakNotes}
                    onChange={(e) => setBreakNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-md p-2 mb-4 outline-none focus:border-blue-400"
                  />

                  {breakStatus && (
                    <p className="text-xs text-gray-500 mb-3">{breakStatus}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingBreak}
                      className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
                    >
                      {savingBreak ? "Saving..." : "Save Break Activity"}
                    </button>
                  </div>
                </form>
              </div>

              {/* History */}
              <div className="bg-white rounded-md shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  History
                </h2>

                {breakHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No break-time activities logged yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {breakHistory.map((log) => (
                      <div
                        key={log._id}
                        className="border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                      >
                        <p className="text-xs text-gray-400 mb-2">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {log.activities.map((a) => (
                            <span
                              key={a}
                              className="text-xs bg-orange-50 text-orange-700 rounded-full px-3 py-1"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                        {log.notes && (
                          <p className="text-sm text-gray-600">{log.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </TeacherDashboardLayout>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.25 4.5a.75.75 0 00-1.5 0v10a.75.75 0 001.5 0v-10zM4.5 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1h-.5a1 1 0 01-1-1V5zM12 5a1 1 0 011-1h.5a1 1 0 011 1v10a1 1 0 01-1 1H13a1 1 0 01-1-1V5z" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 4.5l3.75 3.75" />
    </svg>
  );
}

// Shared inline edit panel used by both the Modules and Past Papers file
// rows above — lets the teacher rename the topic (modules only), move the
// file to a different subject folder, and/or swap in a replacement file,
// all in one small form rather than separate dialogs.
function EditFilePanel({
  isModule,
  editSubject,
  setEditSubject,
  editTopic,
  setEditTopic,
  setEditFile,
  editError,
  savingEdit,
  onCancel,
  onSave,
}: {
  isModule: boolean;
  editSubject: string;
  setEditSubject: (v: string) => void;
  editTopic: string;
  setEditTopic: (v: string) => void;
  setEditFile: (f: File | null) => void;
  editError: string;
  savingEdit: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={editSubject}
          onChange={(e) => setEditSubject(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-400"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isModule && (
          <input
            type="text"
            value={editTopic}
            onChange={(e) => setEditTopic(e.target.value)}
            placeholder="Topic name"
            className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-400"
          />
        )}
      </div>

      <input
        type="file"
        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
        className="text-xs"
      />

      {editError && <p className="text-xs text-red-500">{editError}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={savingEdit}
          className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded disabled:opacity-60"
        >
          {savingEdit ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
