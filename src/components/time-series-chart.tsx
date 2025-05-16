
"use client";

import type React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

// Define the structure for combined data points
// This structure now accommodates multiple scenario lines via dynamic keys
export interface CombinedDataPoint {
  date: string;
  historical?: number | null;
  [scenarioDataKey: string]: number | string | null | undefined; // For scenario forecasts, key is scenarioId
}

interface TimeSeriesChartProps {
  data: CombinedDataPoint[];
  chartConfig: ChartConfig; // Expecting a dynamic chartConfig
  title?: string;
  className?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  chartConfig,
  title,
  className,
}) => {

  const hasAnyData = Object.keys(chartConfig).some(key => {
    if (key === 'date') return false; // 'date' is not a data series itself
    return data.some(p => p[key] !== undefined && p[key] !== null);
  });


  if (!data || data.length === 0 || !hasAnyData) {
    return (
      <div className={`p-4 border rounded-lg bg-card text-card-foreground shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold mb-2">{title || "Time Series Data"}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available to display. Upload CSV or generate scenarios.
        </div>
      </div>
    );
  }
  
  // Data is expected to be pre-formatted by the parent component (page.tsx)
  // with keys matching those in chartConfig.

  return (
    <ChartContainer config={chartConfig} className={`min-h-[300px] w-full ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // Consider formatting if dates are not pre-formatted strings
            // tickFormatter={(value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <ChartTooltip
            cursor={true}
            content={<ChartTooltipContent indicator="line" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          
          {Object.entries(chartConfig).map(([dataKey, seriesConfig]) => {
            // Ensure this series has data before rendering a line for it
            const seriesHasData = data.some(p => p[dataKey] !== undefined && p[dataKey] !== null);
            if (!seriesHasData) return null;

            return (
              <Line 
                key={dataKey}
                dataKey={dataKey}
                type="monotone"
                stroke={`var(--color-${dataKey})`} // ChartStyle sets up CSS variables like --color-historical, --color-scenarioId1
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls={true} // Important for scenarios that might not span the whole historical + forecast range
                name={seriesConfig.label} // For legend and tooltip
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default TimeSeriesChart;

