
export interface TimeSeriesDataPoint {
  date: string; // This will store the value from the 'timestamp' column
  value: number;
}

export function parseCsvForTimeSeries(
  csvString: string,
  valueColumnName: string = 'demand',
  filterItemId?: string,
  filterStoreId?: string
): TimeSeriesDataPoint[] {
  if (!csvString || typeof csvString !== 'string') {
    return [];
  }

  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return []; // Header + at least one data row

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  const timestampIndex = headers.indexOf('timestamp');
  const valueIndex = headers.indexOf(valueColumnName.toLowerCase());
  const itemIdIndex = headers.indexOf('item_id');
  const storeIdIndex = headers.indexOf('store_id');

  if (timestampIndex === -1 || valueIndex === -1) {
    console.error(`CSV headers must include 'timestamp' and '${valueColumnName}'. Found: ${headers.join(', ')}`);
    return [];
  }

  return lines.slice(1).map(line => {
    const values = line.split(',');

    if (filterItemId && itemIdIndex !== -1) {
      const currentItemId = values[itemIdIndex]?.trim();
      if (currentItemId !== filterItemId) {
        return null;
      }
    }

    if (filterStoreId && storeIdIndex !== -1) {
      const currentStoreId = values[storeIdIndex]?.trim();
      if (currentStoreId !== filterStoreId) {
        return null;
      }
    }

    const timestampValue = values[timestampIndex]?.trim();
    const numericValue = parseFloat(values[valueIndex]?.trim());

    if (timestampValue && !isNaN(numericValue)) {
      return { date: timestampValue, value: numericValue };
    }
    return null;
  }).filter(point => point !== null) as TimeSeriesDataPoint[];
}

export function extractUniqueColumnValues(csvString: string, columnName: string): string[] {
  if (!csvString || typeof csvString !== 'string') {
    return [];
  }
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  const columnIndex = headers.indexOf(columnName.toLowerCase());

  if (columnIndex === -1) {
    console.warn(`Column '${columnName}' not found in CSV headers for extracting unique values. Headers: ${headers.join(', ')}`);
    return [];
  }

  const uniqueValues = new Set<string>();
  lines.slice(1).forEach(line => {
    const values = line.split(',');
    const value = values[columnIndex]?.trim();
    if (value) {
      uniqueValues.add(value);
    }
  });
  return Array.from(uniqueValues).sort();
}
