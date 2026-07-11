"use client";

import { use, useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
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
  createdAt: string;
}

const STATUS_STYLE: Record<DoctorDoc["status"], string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-green-700 bg-green-50",
  rejected: "text-red-700 bg-red-50",
};

// Read-only for shadow teachers — only the parent can upload, only the
// admin can review/approve. This just lets the teacher see what's on file.
export default function TeacherDoctorDocumentsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [documents, setDocuments] = useState<DoctorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(
          `${API_BASE}/doctor-documents/student/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
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

    load();
  }, [studentId]);

  return (
    <TeacherDashboardLayout>
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Doctor&apos;s Recommendation
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400 max-w-2xl">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm divide-y divide-gray-50 max-w-2xl">
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
                    className="text-sm font-medium text-gray-800 hover:text-blue-700 break-all text-left"
                  >
                    {doc.fileName}
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
                <span
                  className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${STATUS_STYLE[doc.status]}`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherDashboardLayout>
  );
}
