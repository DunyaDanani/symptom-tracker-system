"use client";

import { useEffect, useState } from "react";
import FamilyDashboardLayout from "@/components/FamilyDashboardLayout";
import BackButton from "@/components/BackButton";
import { openAuthenticatedFile } from "@/lib/fileAccess";

import { API_BASE } from "@/lib/config";

interface DoctorDoc {
  _id: string;
  fileName: string;
  filePath: string;
  fileType: "photo" | "pdf";
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedBy?: { name: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<DoctorDoc["status"], string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-green-700 bg-green-50",
  rejected: "text-red-700 bg-red-50",
};

export default function ParentDoctorDocumentsPage() {
  const [childId, setChildId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DoctorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

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
        `${API_BASE}/doctor-documents/student/${childData.student._id}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.message || "Could not load documents");
      }
    } catch (err) {
      console.error("Failed to load doctor documents", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    if (!childId) return;
    if (!file) {
      setUploadError("Choose a photo or PDF to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("studentId", childId);
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/doctor-documents`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setFile(null);
        await load();
      } else {
        setUploadError(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Failed to upload document", err);
      setUploadError("Unable to reach the server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/doctor-documents/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await load();
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  return (
    <FamilyDashboardLayout role="parent">
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Doctor&apos;s Recommendation
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Upload your child&apos;s doctor recommendation as a photo or PDF. The
        school admin will review it.
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Upload */}
          <form
            onSubmit={handleUpload}
            className="bg-white rounded-md shadow-sm p-6 space-y-3"
          >
            <p className="text-sm font-semibold text-gray-700">
              Upload a new document
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm text-gray-600"
            />
            <div>
              <button
                type="submit"
                disabled={uploading}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {uploadError && (
              <p className="text-xs text-red-500">{uploadError}</p>
            )}
          </form>

          {/* History */}
          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <p className="text-sm font-semibold text-gray-700">
                Document History
              </p>
            </div>

            {documents.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-gray-400">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <div key={doc._id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            openAuthenticatedFile(
                              `${API_BASE}/doctor-documents/${doc._id}/file`
                            )
                          }
                          className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-blue-700 text-left"
                        >
                          {doc.fileType === "pdf" ? (
                            <PdfIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <PhotoIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="truncate">{doc.fileName}</span>
                        </button>
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded {new Date(doc.createdAt).toLocaleString()}
                        </p>
                        {doc.status !== "pending" && doc.reviewNote && (
                          <p className="text-xs text-gray-500 mt-1">
                            Admin note: {doc.reviewNote}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLE[doc.status]}`}
                        >
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </FamilyDashboardLayout>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
