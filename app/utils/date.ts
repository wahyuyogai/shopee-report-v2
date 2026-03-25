export const parseCustomDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null;

  const str = String(dateStr).trim();

  // Try DD/MM/YYYY or D/M/YYYY first
  const ddMmYyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddMmYyyyMatch) {
    const day = ddMmYyyyMatch[1].padStart(2, '0');
    const month = ddMmYyyyMatch[2].padStart(2, '0');
    const year = ddMmYyyyMatch[3];
    const d = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD-MM-YYYY
  const ddMmYyyyDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (ddMmYyyyDashMatch) {
    const day = ddMmYyyyDashMatch[1].padStart(2, '0');
    const month = ddMmYyyyDashMatch[2].padStart(2, '0');
    const year = ddMmYyyyDashMatch[3];
    const d = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // Try direct parsing first (handles ISO 8601 and other standard formats)
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // Handle "DD-MM-YYYY HH:mm" or "DD-MM-YYYY"
  const parts = str.match(/(\d{1,2})-(\d{1,2})-(\d{4})(?: (\d{1,2}):(\d{1,2}))?/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[3], 10);
    const hour = parts[4] ? parseInt(parts[4], 10) : 0;
    const minute = parts[5] ? parseInt(parts[5], 10) : 0;

    const date = new Date(Date.UTC(year, month, day, hour, minute));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  console.warn(`Could not parse date: "${str}"`);
  return null; // Return null if no format matches
};
