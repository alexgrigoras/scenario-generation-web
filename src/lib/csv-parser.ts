export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  // Optional: type can distinguish between price, demand, etc.
  // For simplicity, we'll assume 'value' is the primary metric (e.g., demand).
}

export function parseCsvForTimeSeries(
  csvString: string,
  valueColumnName: string = 'demand' // Default to 'demand', can be 'price' or other
): TimeSeriesDataPoint[] {
  if (!csvString || typeof csvString !== 'string') {
    return [];
  }

  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data row

  const headers = lines[0].split(',').map(header => header.trim());
  const dateIndex = headers.indexOf('date');
  const valueIndex = headers.indexOf(valueColumnName);

  if (dateIndex === -1 || valueIndex === -1) {
    console.error(`CSV headers must include 'date' and '${valueColumnName}'. Found: ${headers.join(', ')}`);
    return [];
  }

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const date = values[dateIndex]?.trim();
    const value = parseFloat(values[valueIndex]?.trim());

    if (date && !isNaN(value)) {
      return { date, value };
    }
    return null;
  }).filter(point => point !== null) as TimeSeriesDataPoint[];
}
