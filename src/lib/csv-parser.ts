
import { parse, differenceInDays, differenceInMonths, isValid } from 'date-fns';

export interface TimeSeriesDataPoint {
  date: string; // This will store the value from the 'timestamp' column
  value: number;
}

// Attempt to parse a date string with multiple common formats
function parseDate(dateString: string): Date | null {
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy/MM/dd',
    'MM-dd-yyyy',
    'dd-MM-yyyy',
    'yyyyMMdd',
    // Add more formats as needed
  ];
  for (const format of formats) {
    try {
      const parsed = parse(dateString, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Ignore parsing errors, try next format
    }
  }
  // Fallback for ISO-like strings if not covered or specific formats fail
  const isoParsed = new Date(dateString);
  if (isValid(isoParsed)) {
    return isoParsed;
  }
  return null;
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

  if (timestampIndex === -1) {
    console.error(`CSV headers must include 'timestamp'. Found: ${headers.join(', ')}`);
    return [];
  }
   if (valueIndex === -1 && (valueColumnName === 'demand' || valueColumnName === 'price')) {
    // Only error if it's one of the primary value columns we expect.
    // If a forecast CSV is missing 'demand' or 'price' but we're parsing it for the other, it's fine.
    console.warn(`CSV headers might be missing '${valueColumnName}'. Found: ${headers.join(', ')}. This might be okay if the column is not expected for this specific parsing operation.`);
    // Do not return [] here, as the column might legitimately be absent in some forecast outputs for one of the metrics.
  }


  const dataPoints: TimeSeriesDataPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines
    const values = line.split(',');

    if (filterItemId && itemIdIndex !== -1) {
      const currentItemId = values[itemIdIndex]?.trim();
      if (currentItemId !== filterItemId) {
        continue;
      }
    }

    if (filterStoreId && storeIdIndex !== -1) {
      const currentStoreId = values[storeIdIndex]?.trim();
      if (currentStoreId !== filterStoreId) {
        continue;
      }
    }

    const timestampValue = values[timestampIndex]?.trim();
    const numericValueStr = valueIndex !== -1 ? values[valueIndex]?.trim() : undefined;
    const numericValue = numericValueStr ? parseFloat(numericValueStr) : NaN;


    if (timestampValue && !isNaN(numericValue)) {
      dataPoints.push({ date: timestampValue, value: numericValue });
    } else if (timestampValue && valueIndex === -1 && (valueColumnName === 'demand' || valueColumnName === 'price')) {
      // If we are looking for demand or price and the column is missing, but we have a timestamp.
      // This handles cases where a forecast might only return one metric. We still want the date.
      // The chart component should handle missing values gracefully for a series.
      // We can push a point with NaN or a specific marker if needed, or let it be filtered by !isNaN check for now.
      // For the purpose of frequency detection, we need the dates.
      // For charting, if valueColumn is missing, that series won't plot, which is fine.
    }
  }
  return dataPoints;
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
    if (!line.trim()) return; // Skip empty lines
    const values = line.split(',');
    const value = values[columnIndex]?.trim();
    if (value) {
      uniqueValues.add(value);
    }
  });
  return Array.from(uniqueValues).sort();
}


export function detectTimeSeriesFrequency(
  dataPoints: TimeSeriesDataPoint[]
): 'days' | 'months' | 'unknown' {
  if (dataPoints.length < 2) {
    return 'unknown'; // Not enough data to determine frequency
  }

  // Sort by date to be sure, though they should be from parseCsvForTimeSeries
  const sortedPoints = [...dataPoints].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (dateA && dateB) {
      return dateA.getTime() - dateB.getTime();
    }
    return 0;
  });

  let dailyDiffCount = 0;
  let monthlyDiffCount = 0;
  const sampleSize = Math.min(sortedPoints.length - 1, 10); // Analyze up to 10 differences

  if (sampleSize === 0 && sortedPoints.length === 1) return 'unknown'; // Only one point
  if (sampleSize === 0 && sortedPoints.length > 1) { // Should not happen if dataPoints.length >=2
     console.warn("Frequency detection: sampleSize is 0 with multiple points, check sorting or data.");
     return 'unknown';
  }


  for (let i = 0; i < sampleSize; i++) {
    const date1 = parseDate(sortedPoints[i].date);
    const date2 = parseDate(sortedPoints[i + 1].date);

    if (!date1 || !date2) {
      console.warn(`Could not parse dates for frequency detection: ${sortedPoints[i].date}, ${sortedPoints[i+1].date}`);
      return 'unknown'; // Cannot determine if dates are invalid
    }
    
    const dayDiff = differenceInDays(date2, date1);
    const monthDiff = differenceInMonths(date2, date1);

    if (monthDiff === 1 && (dayDiff >= 28 && dayDiff <= 31)) { // Typical month difference allowing for day variations
        monthlyDiffCount++;
    } else if (dayDiff === 1 && monthDiff === 0) { // Exactly one day difference
        dailyDiffCount++;
    } else if (dayDiff > 1 && dayDiff < 7 && monthDiff === 0) { // Could be daily with gaps, still treat as daily trend
        dailyDiffCount++; // Looser daily check
    } else if (monthDiff === 1) { // If monthDiff is 1, it's likely monthly even if dayDiff is not perfect
        monthlyDiffCount++;
    }
  }
  
  // If a clear majority of sampled differences point to one frequency
  if (monthlyDiffCount > dailyDiffCount && monthlyDiffCount >= sampleSize * 0.7) {
    return 'months';
  }
  if (dailyDiffCount > monthlyDiffCount && dailyDiffCount >= sampleSize * 0.7) {
    return 'days';
  }
  // Fallback: if counts are low or mixed, check average difference more broadly
  if (sampleSize > 0) {
      const firstDate = parseDate(sortedPoints[0].date);
      const lastDate = parseDate(sortedPoints[sortedPoints.length - 1].date);
      if(firstDate && lastDate) {
          const totalDays = differenceInDays(lastDate, firstDate);
          const totalMonths = differenceInMonths(lastDate, firstDate);
          const numIntervals = sortedPoints.length -1;

          if (numIntervals > 0) {
            const avgDaysPerInterval = totalDays / numIntervals;
            if (totalMonths >= numIntervals * 0.8 && totalMonths <= numIntervals * 1.2 && avgDaysPerInterval > 25 && avgDaysPerInterval < 35) return 'months';
            if (avgDaysPerInterval > 0.8 && avgDaysPerInterval < 1.5) return 'days'; // Average interval is about a day
          }
      }
  }


  return 'unknown'; // Default if no clear pattern
}
