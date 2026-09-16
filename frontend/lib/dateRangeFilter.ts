// Shared client-side date-range filter for history/log tables (symptom
// logs, emotion check-ins, etc). Filtering happens client-side against
// records already fetched via GET .../history — no backend changes needed,
// since these lists are already scoped to a single student and are small
// enough to filter in the browser.
export function filterByDateRange<T>(
  items: T[],
  from: string,
  to: string,
  getDate: (item: T) => string
): T[] {
  if (!from && !to) return items;

  // Dates come from <input type="date"> as "YYYY-MM-DD" (local, no time).
  // Treat "from" as the start of that day and "to" as the end of that day
  // so the selected end date is inclusive.
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;

  return items.filter((item) => {
    const time = new Date(getDate(item)).getTime();
    return time >= fromTime && time <= toTime;
  });
}
