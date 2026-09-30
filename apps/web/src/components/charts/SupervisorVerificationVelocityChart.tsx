"use client";

import React from "react";
import { ChartCard, ColumnChart, COLORS, EmptyChart, Legend, MonthInput, Stats } from "./ChartCard";

export interface WeeklyVerificationData {
  week: string;        // e.g. "Week 1", "Week 2"
  dateRange: string;   // e.g. "1 - 7 Sep", "29 - 30 Sep"
  submitted: number;   // Inbound reports from vendor
  reviewed: number;    // Reports verified by supervisor
}

interface SupervisorVerificationVelocityChartProps {
  data: WeeklyVerificationData[];
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange?: (month: number, year: number) => void;
  title?: string;
  subtitle?: string;
}

const SERIES = [
  { label: "Submitted", color: COLORS.muted },
  { label: "Reviewed", color: COLORS.ink },
];

export default function SupervisorVerificationVelocityChart({
  data,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  title = "Reports per Week",
  subtitle,
}: SupervisorVerificationVelocityChartProps) {
  const submitted = data.reduce((a, d) => a + d.submitted, 0);
  const reviewed = data.reduce((a, d) => a + d.reviewed, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={<MonthInput month={selectedMonth} year={selectedYear} onChange={onPeriodChange} />}
    >
      <Stats
        items={[
          { label: "Submitted", value: submitted },
          { label: "Reviewed", value: reviewed },
          { label: "Waiting for review", value: Math.max(submitted - reviewed, 0) },
        ]}
      />
      {submitted === 0 && reviewed === 0 ? (
        <EmptyChart text="No reports this month." />
      ) : (
        <>
          <ColumnChart
            series={SERIES}
            groups={data.map((d) => ({ label: d.week, sublabel: d.dateRange, values: [d.submitted, d.reviewed] }))}
          />
          <Legend items={SERIES} />
        </>
      )}
    </ChartCard>
  );
}
