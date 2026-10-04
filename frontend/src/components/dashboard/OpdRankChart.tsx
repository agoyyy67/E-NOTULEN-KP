"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface OpdRankData {
  opd_name: string;
  total: number;
}

interface OpdRankChartProps {
  data: OpdRankData[];
}

const COLORS = [
  "#065F46",
  "#047857",
  "#059669",
  "#10B981",
  "#34D399",
  "#6EE7B7",
  "#A7F3D0",
];

export function OpdRankChart({ data }: OpdRankChartProps) {
  return (
    <div className="w-full h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="opd_name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
            width={140}
            tickFormatter={(value) =>
              value.length > 22 ? `${value.substring(0, 22)}...` : value
            }
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#CBD5E1",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              fontSize: "12px",
            }}
            formatter={(value) => [`${value ?? 0} Notulen`, "Total Notulen"]}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={24} barSize={20}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
