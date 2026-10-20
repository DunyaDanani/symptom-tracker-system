"use client";

import { useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Always renders 6 week rows so the card keeps the same height from month
// to month, and the rows stretch to fill whatever height the card is given
// (e.g. matching the info card beside it on the dashboards) instead of
// leaving a blank gap underneath.
export default function MiniCalendar({ today }: { today: Date }) {
  const [viewDate, setViewDate] = useState(today);

  const monthLabel = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="bg-white rounded-md shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrev}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Prev
        </button>
        <p className="text-red-500 font-semibold">{monthLabel}</p>
        <button
          onClick={goNext}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="font-medium text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6 text-center text-xs min-h-[216px]">
        {cells.map((day, idx) => {
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div key={idx} className="flex items-center justify-center">
              {day !== null && (
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    isToday
                      ? "border border-blue-400 text-blue-600 font-medium"
                      : "text-gray-600"
                  }`}
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
