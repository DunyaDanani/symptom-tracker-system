"use client";

import { useState } from "react";

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

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="bg-white rounded-md shadow-sm p-5">
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

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="font-medium text-gray-500 py-1">
            {d}
          </div>
        ))}

        {cells.map((day, idx) => {
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={idx}
              className={`py-1.5 rounded-full ${
                day === null
                  ? ""
                  : isToday
                  ? "border border-blue-400 text-blue-600 font-medium"
                  : "text-gray-600"
              }`}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
