import fs from 'fs';

function readJson(path: string) {
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

const p = readJson('public/data/provincial_generation_sample.json');
console.log("Provincial:", p[0]?.date, p[p.length - 1]?.date);

const o = readJson('public/data/ontario_demand_sample.json');
console.log("Ontario:", o[0]?.datetime, o[o.length - 1]?.datetime);
