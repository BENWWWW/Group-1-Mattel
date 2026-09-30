"use client";

import React from "react";
import { ChartCard, ColumnChart, COLORS, EmptyChart, Legend, Select, Stats } from "./ChartCard";

export interface MonthlyPMData {
  month: string;
  monthIndex: number; // 0 for Jan, 11 for Des
  completed: number;
  inProgress: number;
  overdue: number;
  isFuture?: boolean;
}

interface AdminMonthlyTrendChartProps {
  data: MonthlyPMData[];
  selectedYear: number;
  availableYears?: number[];
  onYearChange?: (year: number) => void;
  title?: string;
  subtitle?: string;
}

const SERIES = [
  { label: "Completed", color: COLORS.good },
  { label: "In progress", color: COLORS.neutral },
  { label: "Overdue", color: COLORS.critical },
];

export default function AdminMonthlyTrendChart({
  data,
  selectedYear,
  availableYears = [],
  onYearChange,
  title = "Monthly PM Tasks",
  subtitle,
}: AdminMonthlyTrendChartProps) {
  const completed = data.reduce((a, d) => a + d.completed, 0);
  const overdue = data.reduce((a, d) => a + d.overdue, 0);
  const total = data.reduce((a, d) => a + d.completed + d.inProgress + d.overdue, 0);

  const thisYear = new Date().getFullYear();
  const years = Array.from(
    new Set([selectedYear, ...availableYears, ...Array.from({ length: 6 }, (_, i) => thisYear + 1 - i)])
  ).sort((a, b) => b - a);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        <Select
          label="Select year"
          value={selectedYear}
          onChange={(v) => onYearChange?.(Number(v))}
          options={years.map((y) => ({ value: y, label: String(y) }))}
        />
      }
    >
      <Stats
        items={[
          { label: "Total tasks", value: total },
          { label: "Completed", value: `${completed} (${total ? Math.round((completed / total) * 100) : 0}%)` },
          { label: "Overdue", value: overdue },
        ]}
      />
      {total === 0 ? (
        <EmptyChart text={`No PM tasks in ${selectedYear}.`} />
      ) : (
        <>
          <ColumnChart
            stacked
            series={SERIES}
            groups={data.map((d) => ({
              label: d.month,
              values: [d.completed, d.inProgress, d.overdue],
              muted: d.isFuture,
            }))}
          />
          <Legend items={SERIES} />
        </>
      )}
    </ChartCard>
  );
}
