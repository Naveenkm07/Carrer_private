import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const APPS_FILE = path.join(DATA_DIR, 'applications.md');
const PIPELINE_FILE = path.join(DATA_DIR, 'pipeline.md');

/**
 * Simple parser for applications.md
 * Expected format: | # | Date | Company | Role | Score | Status | PDF | Report |
 */
async function parseApplications() {
  try {
    const content = await fs.readFile(APPS_FILE, 'utf-8');
    const lines = content.split('\n');
    const apps = [];
    
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('| # |') && !line.includes('|---|')) {
        const parts = line.split('|').map(s => s.trim()).filter(s => s !== '');
        if (parts.length >= 6) {
          apps.push({
            id: parts[0],
            date: parts[1],
            company: parts[2],
            role: parts[3],
            score: parts[4],
            status: parts[5],
            pdf: parts[6] || '',
            report: parts[7] || ''
          });
        }
      }
    }
    return apps;
  } catch (error) {
    return [];
  }
}

/**
 * Simple parser for pipeline.md (Pending URLs)
 */
async function parsePipeline() {
  try {
    const content = await fs.readFile(PIPELINE_FILE, 'utf-8');
    const lines = content.split('\n');
    const pending = [];
    
    let isPendingSection = false;
    for (const line of lines) {
      if (line.includes('# Pending') || line.includes('## Pendientes')) {
        isPendingSection = true;
        continue;
      }
      if (line.startsWith('#') && isPendingSection) {
        isPendingSection = false;
      }
      
      if (isPendingSection && line.startsWith('- [ ]')) {
        const match = line.match(/- \[ \] (https?:\/\/[^\s|]+)\s*\|\s*([^|]+)\s*\|\s*(.*)/);
        if (match) {
          pending.push({
            url: match[1],
            company: match[2].trim(),
            role: match[3].trim()
          });
        }
      }
    }
    return pending;
  } catch (error) {
    return [];
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Career-Ops Dashboard</title>
    <style>
        :root {
            --bg: #1e1e2e;
            --fg: #cdd6f4;
            --surface: #313244;
            --primary: #89b4fa;
            --secondary: #f5c2e7;
            --success: #a6e3a1;
            --warning: #f9e2af;
            --danger: #f38ba8;
            --border: #45475a;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg);
            color: var(--fg);
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 1200px;
            width: 100%;
        }
        header {
            margin-bottom: 30px;
            text-align: center;
        }
        h1 { color: var(--primary); margin-bottom: 5px; }
        .subtitle { color: var(--secondary); opacity: 0.8; }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--surface);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid var(--border);
        }
        .stat-val { font-size: 2em; font-weight: bold; color: var(--primary); }
        .stat-label { opacity: 0.7; font-size: 0.9em; margin-top: 5px; }

        .card {
            background: var(--surface);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid var(--border);
            overflow-x: auto;
        }
        h2 { margin-top: 0; font-size: 1.2em; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 20px; }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        th, td {
            padding: 12px;
            border-bottom: 1px solid var(--border);
        }
        th { color: var(--secondary); font-weight: 600; cursor: pointer; }
        th:hover { color: var(--primary); }
        tr:hover { background: rgba(255,255,255,0.03); }

        .badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-applied { background: var(--primary); color: #1e1e2e; }
        .status-interview { background: var(--success); color: #1e1e2e; }
        .status-rejected { background: var(--danger); color: #1e1e2e; }
        .status-evaluated { background: var(--warning); color: #1e1e2e; }

        .score { font-weight: bold; }
        .score-high { color: var(--success); }
        .score-mid { color: var(--warning); }
        .score-low { color: var(--danger); }

        .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        input, select {
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--fg);
            padding: 8px 12px;
            border-radius: 6px;
            outline: none;
        }
        input:focus { border-color: var(--primary); }

        .empty-state { text-align: center; padding: 40px; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Career-Ops Dashboard</h1>
            <div class="subtitle">Personal Job Search Pipeline • NAVEEN KUMAR K M</div>
        </header>

        <div class="stats" id="stats">
            <div class="stat-card"><div class="stat-val" id="stat-total">-</div><div class="stat-label">Total Apps</div></div>
            <div class="stat-card"><div class="stat-val" id="stat-pending">-</div><div class="stat-label">In Pipeline</div></div>
            <div class="stat-card"><div class="stat-val" id="stat-avg-score">-</div><div class="stat-label">Avg Score</div></div>
        </div>

        <div class="card">
            <h2>Active Applications</h2>
            <div class="filters">
                <input type="text" id="search" placeholder="Search company or role...">
                <select id="filter-status">
                    <option value="all">All Statuses</option>
                    <option value="Evaluated">Evaluated</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>
            <table id="apps-table">
                <thead>
                    <tr>
                        <th onclick="sortApps('id')">#</th>
                        <th onclick="sortApps('date')">Date</th>
                        <th onclick="sortApps('company')">Company</th>
                        <th onclick="sortApps('role')">Role</th>
                        <th onclick="sortApps('score')">Score</th>
                        <th onclick="sortApps('status')">Status</th>
                    </tr>
                </thead>
                <tbody id="apps-body">
                    <tr><td colspan="6" class="empty-state">Loading data...</td></tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>Pipeline Inbox (Pending)</h2>
            <table id="pipeline-table">
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="pipeline-body">
                    <tr><td colspan="3" class="empty-state">Loading data...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        let allApps = [];
        let sortCol = 'id';
        let sortDir = 1;

        async function fetchData() {
            try {
                const res = await fetch('/api/data');
                const data = await res.json();
                allApps = data.apps;
                renderApps(allApps);
                renderPipeline(data.pipeline);
                updateStats(data.apps, data.pipeline);
            } catch (e) {
                console.error(e);
            }
        }

        function renderApps(apps) {
            const body = document.getElementById('apps-body');
            if (apps.length === 0) {
                body.innerHTML = '<tr><td colspan="6" class="empty-state">No applications found in applications.md</td></tr>';
                return;
            }

            body.innerHTML = apps.map(app => \`
                <tr>
                    <td>\${app.id}</td>
                    <td>\${app.date}</td>
                    <td><strong>\${app.company}</strong></td>
                    <td>\${app.role}</td>
                    <td><span class="score \${getScoreClass(app.score)}">\${app.score}</span></td>
                    <td><span class="badge status-\${app.status.toLowerCase()}">\${app.status}</span></td>
                </tr>
            \`).join('');
        }

        function renderPipeline(pipeline) {
            const body = document.getElementById('pipeline-body');
            if (pipeline.length === 0) {
                body.innerHTML = '<tr><td colspan="3" class="empty-state">Pipeline is empty</td></tr>';
                return;
            }

            body.innerHTML = pipeline.map(item => \`
                <tr>
                    <td><strong>\${item.company}</strong></td>
                    <td>\${item.role}</td>
                    <td><a href="\${item.url}" target="_blank" style="color: var(--primary)">Apply &rarr;</a></td>
                </tr>
            \`).join('');
        }

        function updateStats(apps, pipeline) {
            document.getElementById('stat-total').innerText = apps.length;
            document.getElementById('stat-pending').innerText = pipeline.length;
            
            const scores = apps.map(a => parseFloat(a.score)).filter(s => !isNaN(s));
            const avg = scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : '-';
            document.getElementById('stat-avg-score').innerText = avg;
        }

        function getScoreClass(score) {
            const s = parseFloat(score);
            if (s >= 4.5) return 'score-high';
            if (s >= 3.5) return 'score-mid';
            return 'score-low';
        }

        function sortApps(col) {
            if (sortCol === col) sortDir *= -1;
            else { sortCol = col; sortDir = 1; }
            
            const sorted = [...allApps].sort((a, b) => {
                let v1 = a[col], v2 = b[col];
                if (!isNaN(parseFloat(v1)) && !isNaN(parseFloat(v2))) {
                    v1 = parseFloat(v1); v2 = parseFloat(v2);
                }
                return v1 > v2 ? sortDir : -sortDir;
            });
            renderApps(sorted);
        }

        document.getElementById('search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allApps.filter(a => 
                a.company.toLowerCase().includes(val) || 
                a.role.toLowerCase().includes(val)
            );
            renderApps(filtered);
        });

        document.getElementById('filter-status').addEventListener('change', (e) => {
            const val = e.target.value;
            const filtered = val === 'all' ? allApps : allApps.filter(a => a.status === val);
            renderApps(filtered);
        });

        fetchData();
    </script>
</body>
</html>
    `;
    res.end(html);
  } else if (req.url === '/api/data') {
    const apps = await parseApplications();
    const pipeline = await parsePipeline();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ apps, pipeline }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Dashboard running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
