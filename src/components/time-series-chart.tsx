
"use client";

import type React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

// Define the structure for combined data points
export interface CombinedDataPoint {
  date: string;
  historical?: number | null;
  forecasted?: number | null;
}

interface TimeSeriesChartProps {
  data: CombinedDataPoint[];
  title?: string;
  className?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  className,
}) => {
  const chartConfig = {
    historical: {
      label: "Historical Demand",
      color: "hsl(var(--chart-1))",
    },
    forecasted: {
      label: "Forecasted Demand",
      color: "hsl(var(--chart-2))",
    },
  };

  const hasHistoricalData = data.some(p => p.historical !== undefined && p.historical !== null);
  const hasForecastedData = data.some(p => p.forecasted !== undefined && p.forecasted !== null);

  if (!data || data.length === 0 || (!hasHistoricalData && !hasForecastedData)) {
    return (
      <div className={`p-4 border rounded-lg bg-card text-card-foreground shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold mb-2">{title || "Demand Data"}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available to display. Upload CSV to see historical demand.
        </div>
      </div>
    );
  }
  
  const formattedData = data.map(item => ({
    ...item,
    // Ensure date is a string, if it needs specific parsing/formatting for XAxis, handle here
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
            cursor={true}
            content={<ChartTooltipContent indicator="line" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {hasHistoricalData && (
            <Line 
              dataKey="historical" 
              type="monotone"
              stroke="var(--color-historical)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls={true}
              name="Historical Demand"
            />
          )}
          {hasForecastedData && (
            <Line 
              dataKey="forecasted" 
              type="monotone"
              stroke="var(--color-forecasted)"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls={true}
              name="Forecasted Demand"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default TimeSeriesChart;
