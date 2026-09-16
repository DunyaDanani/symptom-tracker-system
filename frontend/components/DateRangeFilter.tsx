"use client";

// Small "From / To" date-range picker used above history/log tables
// (symptom logs, emotion check-ins) across the parent, teacher, admin, and
// principal dashboards. Purely a controlled UI — the parent page owns the
// from/to state and does the actual filtering (see lib/dateRangeFilter.ts).
export default function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  resultCount,
  className = "",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
  className?: string;
}) {
  const hasFilter = Boolean(from || to);

  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            From
          </label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            To
          </label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-blue-600 hover:underline pb-2.5"
          >
            Clear dates
          </button>
        )}
      </div>
      {hasFilter && resultCount !== undefined && (
        <p className="text-xs text-gray-400 pb-2.5">
          {resultCount} {resultCount === 1 ? "entry" : "entries"} in range
        </p>
      )}
    </div>
  );
}
