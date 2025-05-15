
"use client";

import type React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { TimeSeriesDataPoint } from '@/lib/csv-parser';

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  dataKey?: string;
  className?: string;
  lineColor?: string; // e.g., "hsl(var(--chart-1))"
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  dataKey = "value",
  className,
  lineColor = "hsl(var(--chart-1))" // Default line color
}) => {
  const chartConfig = {
    [dataKey]: {
      label: title || dataKey.charAt(0).toUpperCase() + dataKey.slice(1),
      color: lineColor,
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
  
  const formattedData = data.map(item => ({
    ...item,
    date: item.date, 
  }));


  return (
    <ChartContainer config={chartConfig} className={`min-h-[300px] w-full ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
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
            cursor={true} // Show cursor for line chart
            content={<ChartTooltipContent indicator="line" />} // Use line indicator for tooltip
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line 
            dataKey={dataKey} 
            type="monotone" // Makes the line smooth
            stroke={`var(--color-${dataKey})`} // Use stroke for line color
            strokeWidth={2} // Line thickness
            dot={{ r: 3 }} // Show dots on data points
            activeDot={{ r: 5 }} // Enlarge dot on hover/active
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default TimeSeriesChart;

