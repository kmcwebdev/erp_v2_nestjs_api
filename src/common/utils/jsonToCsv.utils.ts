export function jsonToCsv<T extends Record<string, any>>(
  jsonData: T[],
): string {
  // Check if the array is empty
  if (jsonData.length === 0) {
    return '';
  }

  // Extract keys for CSV header from the first object in the array
  const headers = Object.keys(jsonData[0]);

  // Convert data values, handling special characters
  const formatValue = (value: any): string => {
    if (typeof value === 'string' && /[\n,"]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return String(value);
  };

  // Map over the array of objects to create an array of CSV row strings
  const rows = jsonData.map((object) => {
    const values = headers.map((key) => formatValue(object[key]));
    return values.join(',');
  });

  // Combine header and rows
  return `${headers.join(',')}\n${rows.join('\n')}`;
}
