"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendPoint {
  label: string;
  count: number;
}

export default function SymptomTrendChart({ data }: { data: TrendPoint[] }) {
  const highest = Math.max(5, ...data.map((d) => d.count));
  // Explicit, evenly spaced whole-number ticks (0,1,2,3,4,5 ...) — left to
  // itself the chart picked uneven ones and skipped numbers (5, 4, 2).
  // Steps grow for busy weeks so the axis never gets crowded.
  const step = highest <= 10 ? 1 : highest <= 20 ? 2 : highest <= 50 ? 5 : 10;
  const maxCount = Math.ceil(highest / step) * step;
  const ticks = Array.from({ length: maxCount / step + 1 }, (_, i) => i * step);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, maxCount]}
            ticks={ticks}
            interval={0}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            label={{
              value: "Symptoms logged",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#6b7280",
            }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e5e7eb",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Symptoms logged"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ r: 4, fill: "#dc2626" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
