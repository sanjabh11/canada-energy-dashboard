function shiftTimestampsToNow<T>(records: T[], dateField: keyof T): T[] {
  if (!records || records.length === 0) return records;
  
  let maxTime = -Infinity;
  for (const record of records) {
    const val = record[dateField] as unknown as string;
    if (!val) continue;
    // Handle "YYYY-MM" format safely
    const parsed = new Date(val.length === 7 && val.includes('-') ? `${val}-01` : val).getTime();
    if (!isNaN(parsed) && parsed > maxTime) {
      maxTime = parsed;
    }
  }
  
  if (maxTime === -Infinity) return records;
  
  const shift = Date.now() - maxTime;
  
  return records.map(record => {
    const val = record[dateField] as unknown as string;
    if (!val) return record;
    
    const originalTime = new Date(val.length === 7 && val.includes('-') ? `${val}-01` : val).getTime();
    if (isNaN(originalTime)) return record;
    
    const shiftedDate = new Date(originalTime + shift);
    let newDateStr = shiftedDate.toISOString();
    
    if (val.length === 7 && val.includes('-')) {
      newDateStr = newDateStr.substring(0, 7);
    } else if (val.length === 10 && val.includes('-')) {
      newDateStr = newDateStr.substring(0, 10);
    } else if (val.includes(' ')) {
      newDateStr = newDateStr.substring(0, 19).replace('T', ' ');
    }
    
    return {
      ...record,
      [dateField]: newDateStr
    };
  });
}

const res = shiftTimestampsToNow([{ date: '2008-01' }, { date: '2010-07' }], 'date');
console.log(res);

const res2 = shiftTimestampsToNow([{ datetime: '2023-01-01 00:00:00' }, { datetime: '2023-03-25 07:00:00' }], 'datetime');
console.log(res2);
