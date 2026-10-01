/** CSV parser with quoted fields/newlines and explicit row limits. No eval. */
export function parseCsv(input: string): string[][] {
  if(input.length>2_000_000)throw new Error('CSV is limited to 2 MB');
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  input=input.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field||closed)throw new Error('Invalid CSV quoting');quoted=true;}
    else if(c===','){row.push(field);field='';closed=false;}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.length))rows.push(row);row=[];field='';closed=false;if(rows.length>1001)throw new Error('Import at most 1,000 rows');}
    else{if(closed)throw new Error('Unexpected text after a quoted value');field+=c;}
  }
  if(quoted)throw new Error('A quoted CSV value is not closed');
  row.push(field);if(row.some(v=>v.length))rows.push(row);
  if(rows.length>1001)throw new Error('Import at most 1,000 rows');
  if(rows.some(r=>r.length!==rows[0].length))throw new Error('CSV rows have different numbers of columns');
  return rows;
}
export function mapMetricRows(rows:string[][],mapping:{day:number;category:number;amount:number;id:number}) {
  const seen=new Set<string>();
  return rows.slice(1).map((row,i)=>{
    const day=row[mapping.day]?.trim(),category=row[mapping.category]?.trim(),raw=row[mapping.amount]?.trim(),source_key=row[mapping.id]?.trim();
    if(!day||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw new Error('Invalid date on row '+(i+2));
    if(!category||category.length>100||!source_key||source_key.length>200||seen.has(source_key))throw new Error('Missing category or duplicate record ID on row '+(i+2));
    if(!raw||! /^-?\d+(\.\d{1,4})?$/.test(raw)||Math.abs(Number(raw))>999999999999)throw new Error('Invalid amount on row '+(i+2));
    seen.add(source_key);return {day,category,source_key,amount:Number(raw)};
  });
}
export function csvExport(rows:Record<string,unknown>[],columns:string[]) {
  const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  return [columns,...rows.map(row=>columns.map(c=>row[c]))].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function habitStreak(days:string[],today:string):number {
  const dates=new Set(days);let date=new Date(today+'T12:00:00Z'),count=0;
  if(!Number.isFinite(date.getTime()))throw new Error('Invalid date');
  if(!dates.has(today))date.setUTCDate(date.getUTCDate()-1);
  while(dates.has(date.toISOString().slice(0,10))){count++;date.setUTCDate(date.getUTCDate()-1);}
  return count;
}
