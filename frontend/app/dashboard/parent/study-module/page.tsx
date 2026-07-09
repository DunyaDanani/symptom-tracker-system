"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ParentDashboardLayout from "@/components/ParentDashboardLayout";

const API_BASE = "http://localhost:5000/api";
const FILE_BASE = "http://localhost:5000";

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

export default function ParentStudyModulePage() {
  const [childId, setChildId] = useState<string | null>(null);
  const [modules, setModules] = useState<TopicGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<ResourceFile[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<ResourceFile[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [noteUploading, setNoteUploading] = useState(false);
  const [noteError, setNoteError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    try {
      const childRes = await fetch(`${API_BASE}/students/child`, {
        headers: authHeaders(),
      });
      const childData = await childRes.json();
      if (!childData.success) {
        setError(childData.message || "Could not load your child's profile");
        return;
      }
      setChildId(childData.student._id);

      const res = await fetch(
        `${API_BASE}/study-modules/student/${childData.student._id}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setModules(data.modules);
        setPastPapers(data.pastPapers);
        setDoctorNotes(data.doctorNotes);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTopic = (topic: string) => {
    setExpanded((prev) => ({ ...prev, [topic]: !prev[topic] }));
  };

  const handleNoteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError("");

    if (!childId) return;
    if (!noteFile) {
      setNoteError("Choose a file to upload.");
      return;
    }

    setNoteUploading(true);
    try {
      const formData = new FormData();
      formData.append("studentId", childId);
      formData.append("type", "doctorNote");
      formData.append("file", noteFile);

      const res = await fetch(`${API_BASE}/study-modules`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setNoteFile(null);
        await load();
      } else {
        setNoteError(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Failed to upload note", err);
      setNoteError("Unable to reach the server.");
    } finally {
      setNoteUploading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/study-modules/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await load();
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const latestDoctorNote = doctorNotes[0] || null;

  return (
    <ParentDashboardLayout>
      <Link
        href="/dashboard/parent"
        className="text-xs text-blue-600 hover:underline"
      >
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Modules
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {/* Modules */}
          <section>
            {modules.length === 0 ? (
              <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
                No modules uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {modules.map((group) => (
                  <div
                    key={group.topic}
                    className="bg-white border border-gray-100 rounded-md overflow-hidden"
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
                          <a
                            key={f._id}
                            href={`${FILE_BASE}/${f.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:text-blue-700"
                          >
                            <BookIcon className="w-4 h-4 text-gray-400" />
                            {f.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Papers */}
          <section>
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Past Papers
            </h2>
            {pastPapers.length === 0 ? (
              <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
                No past papers uploaded yet.
              </div>
            ) : (
              <div className="bg-white divide-y divide-gray-50 border border-gray-100 rounded-md">
                {pastPapers.map((f) => (
                  <a
                    key={f._id}
                    href={`${FILE_BASE}/${f.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:text-blue-700"
                  >
                    <PaperclipIcon className="w-4 h-4 text-gray-400" />
                    {f.fileName}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Doctor's Recommendation */}
          <section>
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Doctors Recommendation
            </h2>
            <div className="bg-white rounded-md shadow-sm p-4">
              {latestDoctorNote && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                  <a
                    href={`${FILE_BASE}/${latestDoctorNote.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-700"
                  >
                    <UploadIcon className="w-4 h-4 text-gray-400" />
                    {latestDoctorNote.fileName}
                  </a>
                  <button
                    onClick={() => handleDeleteNote(latestDoctorNote._id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}

              <form
                onSubmit={handleNoteUpload}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="file"
                  onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-600 flex-1"
                />
                <button
                  type="submit"
                  disabled={noteUploading}
                  className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-60 whitespace-nowrap"
                >
                  {noteUploading
                    ? "Uploading..."
                    : "Upload the doctor's recommendation note"}
                </button>
              </form>
              {noteError && (
                <p className="text-xs text-red-500 mt-2">{noteError}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </ParentDashboardLayout>
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
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"
        clipRule="evenodd"
      />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}
