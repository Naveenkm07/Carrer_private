import fs from 'fs';

const md = fs.readFileSync('data/pipeline.md', 'utf8');
const lines = md.split('\n');
let id = 1;
let tsv = 'id\turl\tsource\tnotes\n';

for (const line of lines) {
  if (line.startsWith('- [ ] ')) {
    const parts = line.substring(6).split(' | ');
    if (parts.length > 0) {
      const url = parts[0].trim();
      const company = parts.length > 1 ? parts[1].trim() : 'Pipeline';
      tsv += `${id}\t${url}\t${company}\t\n`;
      id++;
    }
  }
}

fs.writeFileSync('batch/batch-input.tsv', tsv);
console.log(`Added ${id - 1} jobs to batch-input.tsv`);