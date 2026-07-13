"use client";

import { useEffect, useState } from "react";
import {
  ModuleSubjectGrid,
  PastPaperSubjectGrid,
  type ModuleSubjectGroup,
  type PastPaperSubjectGroup,
} from "@/components/SubjectResourceGrid";
import { API_BASE } from "@/lib/config";

// Shared "Modules" page body used by both the parent and child dashboards
// — resolved through the unified /api/students/linked endpoint so the
// same component works for either role's token. `role` determines which
// dashboard's URL tree the subject cards link into
// (/dashboard/<role>/study-module/modules/<subject>, etc).
export default function StudyModuleContent({
  role,
}: {
  role: "parent" | "child";
}) {
  const basePath = `/dashboard/${role}/study-module`;
  const [modules, setModules] = useState<ModuleSubjectGroup[]>([]);
  const [pastPapers, setPastPapers] = useState<PastPaperSubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
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

    load();
  }, []);

  return (
    <>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Modules
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-10">
          <section>
            <ModuleSubjectGrid groups={modules} basePath={basePath} />
          </section>

          <section>
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              Past Papers
            </h2>
            <PastPaperSubjectGrid groups={pastPapers} basePath={basePath} />
          </section>
        </div>
      )}
    </>
  );
}
