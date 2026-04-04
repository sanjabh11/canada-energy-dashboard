function shiftTimestamps<T>(records: T[], dateField: keyof T): T[] {
  if (records.length === 0) return records;
  
  // Find the max date in the data
  let maxTime = -Infinity;
  for (const record of records) {
    const d = new Date(record[dateField] as unknown as string).getTime();
    if (!isNaN(d) && d > maxTime) maxTime = d;
  }
  
  if (maxTime === -Infinity) return records;
  
  const now = Date.now();
  const shift = now - maxTime; 
  
  return records.map(record => {
    const originalTime = new Date(record[dateField] as unknown as string).getTime();
    if (isNaN(originalTime)) return record;
    
    const shiftedDate = new Date(originalTime + shift);
    const originalStr = String(record[dateField]);
    let newDateStr = shiftedDate.toISOString();
    
    if (originalStr.length === 7 && originalStr.includes('-')) {
      newDateStr = newDateStr.substring(0, 7);
    } else if (originalStr.length === 10 && originalStr.includes('-')) {
        newDateStr = newDateStr.substring(0, 10);
    }
    
    return {
      ...record,
      [dateField]: newDateStr
    };
  });
}

const sample = [
  { date: '2008-01', value: 10 },
  { date: '2010-07', value: 20 }
];

console.log(shiftTimestamps(sample, 'date'));

const sample2 = [
  { datetime: '2023-01-01 00:00:00', val: 1 },
  { datetime: '2023-03-25 07:00:00', val: 2 }
];
console.log(shiftTimestamps(sample2, 'datetime'));
