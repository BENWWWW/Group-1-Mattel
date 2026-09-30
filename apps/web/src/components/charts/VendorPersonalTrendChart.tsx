"use client";

import React from "react";
import { ChartCard, ColumnChart, COLORS, EmptyChart, Legend, MonthInput, Stats } from "./ChartCard";

export interface VendorWeeklyProgress {
  weekIndex?: number;
  period: string;       // e.g. "Week 1", "Week 2", etc.
  dateRange: string;    // e.g. "1 - 7 Sep", "29 - 30 Sep"
  completed: number;    // Tasks completed
  target: number;       // Tasks assigned
}

interface VendorPersonalTrendChartProps {
  data: VendorWeeklyProgress[];
  selectedMonth: number; // 0-11
  selectedYear: number;
  onPeriodChange?: (month: number, year: number) => void;
  title?: string;
  subtitle?: string;
}

const SERIES = [
  { label: "Assigned", color: COLORS.muted },
  { label: "Completed", color: COLORS.ink },
];

export default function VendorPersonalTrendChart({
  data,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  title = "My Tasks per Week",
  subtitle,
}: VendorPersonalTrendChartProps) {
  const assigned = data.reduce((a, d) => a + d.target, 0);
  const completed = data.reduce((a, d) => a + d.completed, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={<MonthInput month={selectedMonth} year={selectedYear} onChange={onPeriodChange} />}
    >
      <Stats
        items={[
          { label: "Assigned", value: assigned },
          { label: "Completed", value: completed },
          { label: "Completion rate", value: `${assigned ? Math.round((completed / assigned) * 100) : 0}%` },
        ]}
      />
      {assigned === 0 && completed === 0 ? (
        <EmptyChart text="No tasks this month." />
      ) : (
        <>
          <ColumnChart
            series={SERIES}
            groups={data.map((d) => ({ label: d.period, sublabel: d.dateRange, values: [d.target, d.completed] }))}
          />
          <Legend items={SERIES} />
        </>
      )}
    </ChartCard>
  );
}
