export function jsonToCsv<T extends Record<string, any>>(jsonData: T): string {
  // Extract keys for CSV header
  const headers = Object.keys(jsonData);

  // Convert data values, handling special characters
  const formatValue = (value: any): string => {
    if (typeof value === 'string' && /[\n,"]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return String(value);
  };

  const values = headers.map((key) => formatValue(jsonData[key]));

  // Combine header and values
  return `${headers.join(',')}\n${values.join(',')}`;
}
