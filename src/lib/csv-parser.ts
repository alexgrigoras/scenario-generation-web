
export interface TimeSeriesDataPoint {
  date: string; // This will store the value from the 'timestamp' column
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

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase()); // Convert headers to lowercase for case-insensitive matching
  const timestampIndex = headers.indexOf('timestamp');
  const valueIndex = headers.indexOf(valueColumnName.toLowerCase());

  if (timestampIndex === -1 || valueIndex === -1) {
    console.error(`CSV headers must include 'timestamp' and '${valueColumnName}'. Found: ${headers.join(', ')}`);
    // Consider throwing an error or returning an object indicating failure type
    return [];
  }

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const timestampValue = values[timestampIndex]?.trim();
    const numericValue = parseFloat(values[valueIndex]?.trim());

    if (timestampValue && !isNaN(numericValue)) {
      // Map the CSV 'timestamp' column to the 'date' field of TimeSeriesDataPoint
      return { date: timestampValue, value: numericValue };
    }
    return null;
  }).filter(point => point !== null) as TimeSeriesDataPoint[];
}
