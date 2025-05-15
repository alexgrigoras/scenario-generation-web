"use client";

import type React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { TimeSeriesDataPoint } from '@/lib/csv-parser';

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  dataKey?: string;
  className?: string;
  barColor?: string; // e.g., "hsl(var(--chart-1))"
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  dataKey = "value",
  className,
  barColor = "hsl(var(--chart-1))"
}) => {
  const chartConfig = {
    [dataKey]: {
      label: title || dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      color: barColor,
    },
  };

  if (!data || data.length === 0) {
    return (
      <div className={`p-4 border rounded-lg bg-card text-card-foreground shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold mb-2">{title || "Time Series Data"}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available to display.
        </div>
      </div>
    );
  }
  
  // Ensure data is in the correct format for Recharts, particularly if dates need sorting or formatting.
  // For simplicity, assuming 'date' is a string suitable for XAxis.
  // If dates are full ISO strings, you might want to format them for display.
  const formattedData = data.map(item => ({
    ...item,
    date: item.date, // Potentially format date here: new Date(item.date).toLocaleDateString()
  }));


  return (
    <ChartContainer config={chartConfig} className={`min-h-[300px] w-full ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default TimeSeriesChart;
