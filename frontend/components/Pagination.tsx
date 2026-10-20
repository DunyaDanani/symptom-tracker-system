"use client";

import { useState } from "react";
import { BTN_SECONDARY } from "@/lib/ui";

// Paging for long history tables (symptom logs, emotion check-ins): shows
// PAGE_SIZE records at a time with Previous / Next and page numbers,
// instead of one endless table.
//
// Usage — call usePager() at the top of the component (with the other
// hooks), slice with paginate(), and render <Pagination> under the table:
//   const pager = usePager();
//   const page = paginate(filteredLogs, pager);
//   page.items.map(...)
//   <Pagination page={page} pager={pager} />

export const PAGE_SIZE = 10;

export interface Pager {
  page: number;
  setPage: (page: number) => void;
}

export function usePager(): Pager {
  const [page, setPage] = useState(1);
  return { page, setPage };
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  start: number; // 1-based index of first item on this page
  end: number;
}

export function paginate<T>(all: T[], pager: Pager, pageSize = PAGE_SIZE): PageSlice<T> {
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  // Clamp, e.g. when a date filter shrinks the list while on a later page.
  const page = Math.min(Math.max(1, pager.page), totalPages);
  const startIdx = (page - 1) * pageSize;
  const items = all.slice(startIdx, startIdx + pageSize);
  return {
    items,
    page,
    totalPages,
    total: all.length,
    start: all.length === 0 ? 0 : startIdx + 1,
    end: startIdx + items.length,
  };
}

// Page numbers to show: always first/last, the current page and its
// neighbours, with "…" gaps.
function pageNumbers(current: number, total: number): (number | "gap")[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= total; p++) {
    if (keep.has(p)) out.push(p);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}

export default function Pagination<T>({
  page,
  pager,
  className = "",
}: {
  page: PageSlice<T>;
  pager: Pager;
  className?: string;
}) {
  if (page.total <= PAGE_SIZE) {
    return page.total > 0 ? (
      <p className={`px-4 py-3 text-xs text-gray-500 border-t border-gray-50 ${className}`}>
        Showing all {page.total} record{page.total === 1 ? "" : "s"}
      </p>
    ) : null;
  }

  const go = (p: number) => pager.setPage(Math.min(Math.max(1, p), page.totalPages));

  return (
    <div
      className={`flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-gray-100 ${className}`}
    >
      <p className="text-xs text-gray-500">
        Showing {page.start}–{page.end} of {page.total}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => go(page.page - 1)}
          disabled={page.page === 1}
          className={BTN_SECONDARY}
        >
          ‹ Prev
        </button>
        {pageNumbers(page.page, page.totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === page.page ? "page" : undefined}
              className={`min-h-10 min-w-10 px-2 rounded text-sm font-medium transition-colors ${
                p === page.page
                  ? "bg-blue-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => go(page.page + 1)}
          disabled={page.page === page.totalPages}
          className={BTN_SECONDARY}
        >
          Next ›
        </button>
      </nav>
    </div>
  );
}
