"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";

const API_BASE = "http://localhost:5000/api";
const FILE_BASE = "http://localhost:5000";

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
}

interface TopicGroup {
  topic: string;
  files: ResourceFile[];
}

export default function TeacherUploadModulesWorkspacePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [modules, setModules] = useState<TopicGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<ResourceFile[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTopic, setNewTopic] = useState("");
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [moduleUploading, setModuleUploading] = useState(false);
  const [moduleError, setModuleError] = useState("");

  const [pastPaperFile, setPastPaperFile] = useState<File | null>(null);
  const [pastPaperUploading, setPastPaperUploading] = useState(false);
  const [pastPaperError, setPastPaperError] = useState("");

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
        setExpanded((prev) => {
          const next = { ...prev };
          data.modules.forEach((m: TopicGroup) => {
            if (!(m.topic in next)) next[m.topic] = true;
          });
          return next;
        });
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
    loadStudent();
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const toggleTopic = (topic: string) => {
    setExpanded((prev) => ({ ...prev, [topic]: !prev[topic] }));
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

  return (
    <TeacherDashboardLayout>
      <Link
        href="/dashboard/teacher/upload-modules"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Modules
      </h1>
      {student && (
        <p className="text-sm text-gray-500 mb-8">
          {student.firstName} {student.lastName} · Grade {student.grade}
          {student.section ? ` · ${student.section}` : ""}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {/* Modules */}
          <section className="bg-white rounded-md shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Add file to Share
            </h2>

            <form
              onSubmit={handleModuleUpload}
              className="flex flex-col sm:flex-row gap-3 mb-6"
            >
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Topic name (e.g. Topic 1)"
                className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
              />
              <input
                type="file"
                onChange={(e) => setModuleFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-600 flex-1"
              />
              <button
                type="submit"
                disabled={moduleUploading}
                className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-60 whitespace-nowrap"
              >
                {moduleUploading ? "Uploading..." : "Add File"}
              </button>
            </form>
            {moduleError && (
              <p className="text-xs text-red-500 -mt-4 mb-4">{moduleError}</p>
            )}

            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Uploaded Files
            </h3>

            {modules.length === 0 ? (
              <p className="text-sm text-gray-400">No modules uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {modules.map((group) => (
                  <div
                    key={group.topic}
                    className="border border-gray-100 rounded-md overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTopic(group.topic)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <ChevronIcon
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                            expanded[group.topic] ? "rotate-90" : ""
                          }`}
                        />
                        {group.topic}
                      </span>
                      <span className="text-xs text-gray-400">
                        {group.files.length} file
                        {group.files.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {expanded[group.topic] && (
                      <div className="divide-y divide-gray-50">
                        {group.files.map((f) => (
                          <div
                            key={f._id}
                            className="flex items-center justify-between px-4 py-2.5"
                          >
                            <a
                              href={`${FILE_BASE}/${f.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-700 hover:text-blue-700 flex items-center gap-2"
                            >
                              <BookIcon className="w-4 h-4 text-gray-400" />
                              {f.fileName}
                            </a>
                            <button
                              onClick={() => handleDelete(f._id)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Papers */}
          <section className="bg-white rounded-md shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Past Papers
            </h2>

            <form
              onSubmit={handlePastPaperUpload}
              className="flex flex-col sm:flex-row gap-3 mb-6"
            >
              <input
                type="file"
                onChange={(e) =>
                  setPastPaperFile(e.target.files?.[0] || null)
                }
                className="text-sm text-gray-600 flex-1"
              />
              <button
                type="submit"
                disabled={pastPaperUploading}
                className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-60 whitespace-nowrap"
              >
                {pastPaperUploading ? "Uploading..." : "Add Past Paper"}
              </button>
            </form>
            {pastPaperError && (
              <p className="text-xs text-red-500 -mt-4 mb-4">
                {pastPaperError}
              </p>
            )}

            {pastPapers.length === 0 ? (
              <p className="text-sm text-gray-400">No past papers uploaded yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 border border-gray-100 rounded-md">
                {pastPapers.map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <a
                      href={`${FILE_BASE}/${f.filePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 hover:text-blue-700 flex items-center gap-2"
                    >
                      <PaperclipIcon className="w-4 h-4 text-gray-400" />
                      {f.fileName}
                    </a>
                    <button
                      onClick={() => handleDelete(f._id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
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
