"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";

// Matches backend/models/AcademicTerm.js TERMS.
export const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
export type Term = (typeof TERMS)[number];

export interface AcademicTermEntry {
  _id: string;
  academicYear: string;
  term: Term;
  startDate: string;
  endDate: string;
}

// Whichever configured term's [startDate, endDate] range contains `date`
// (defaults to today) — used to suggest a sensible default on the manual
// Academic Year / Term selectors so teachers/admins don't have to hunt for
// the current one every time, while still being free to override it.
export function getCurrentTerm(
  terms: AcademicTermEntry[],
  date: Date = new Date()
): AcademicTermEntry | undefined {
  return terms.find(
    (t) => new Date(t.startDate) <= date && new Date(t.endDate) >= date
  );
}

// Distinct academic years present in the calendar, most recent first.
export function getAcademicYears(terms: AcademicTermEntry[]): string[] {
  return Array.from(new Set(terms.map((t) => t.academicYear))).sort(
    (a, b) => b.localeCompare(a)
  );
}

// Shared fetch + "current term" resolution for every page that needs the
// Academic Year / Term calendar — the admit-wizard-style manual selectors
// on symptom/emotion logging forms, the Modules upload form, the report
// range picker, and the admin settings page that manages the calendar
// itself.
export function useAcademicTerms() {
  const [terms, setTerms] = useState<AcademicTermEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/academic-terms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTerms(data.terms);
      } else {
        setError(data.message || "Could not load the academic calendar");
      }
    } catch (err) {
      console.error("Failed to load academic terms", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    terms,
    loading,
    error,
    reload: load,
    academicYears: getAcademicYears(terms),
    currentTerm: getCurrentTerm(terms),
  };
}
