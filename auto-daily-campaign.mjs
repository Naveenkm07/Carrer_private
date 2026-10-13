import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const RESUME_PATH = path.resolve('resume.pdf');
const SENT_DIR = path.resolve('output', 'hsr_campaign', '_SENT');
const APPS_FILE = path.resolve('data', 'applications.md');
const STATE_FILE = path.resolve('output', 'hsr_campaign', 'campaign_state.json');

const BLR_CSV = path.resolve('data', 'Bengaluru_Startups_850_Master.csv');
const INDIA_CSV = path.resolve('data', 'India_Startups_3000_Master.csv');

const DAILY_LIMIT = 100;
const MORNING_HOUR = 9; // 9:00 AM
const MORNING_MINUTE = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

function getSafeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

async function getSentSet() {
    await fs.mkdir(SENT_DIR, { recursive: true });
    const files = await fs.readdir(SENT_DIR);
    return new Set(files.map(f => f.toLowerCase()));
}

async function loadCampaignState() {
    try {
        const data = await fs.readFile(STATE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {
            lastRunDate: '',
            sentToday: 0,
            totalSentLifetime: 100,
            currentPhase: 'Bengaluru',
            history: {}
        };
    }
}

async function saveCampaignState(state) {
    await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function buildUnifiedQueue(sentSet) {
    const queue = [];
    const seen = new Set();

    // 1. First priority: Bengaluru Startups (640 total)
    if (fsSync.existsSync(BLR_CSV)) {
        const blrContent = await fs.readFile(BLR_CSV, 'utf-8');
        const blrLines = blrContent.split(/\r?\n/).filter(l => l.trim().length > 0).slice(1);
        for (const line of blrLines) {
            const cols = parseCSVLine(line);
            if (cols.length >= 6) {
                const name = cols[1];
                const safe = getSafeName(name);
                if (!sentSet.has(safe) && !seen.has(safe)) {
                    seen.add(safe);
                    queue.push({
                        company: name,
                        industry: cols[2] || 'Technology',
                        domain: cols[3] || cols[2] || 'Software & Tech',
                        city: 'Bengaluru',
                        email: cols[5],
                        website: cols[6] || '',
                        priority: 'Bengaluru (Priority 1)'
                    });
                }
            }
        }
    }

    // 2. Second priority: Remaining India-Wide Startups
    if (fsSync.existsSync(INDIA_CSV)) {
        const indiaContent = await fs.readFile(INDIA_CSV, 'utf-8');
        const indiaLines = indiaContent.split(/\r?\n/).filter(l => l.trim().length > 0).slice(1);
        for (const line of indiaLines) {
            const cols = parseCSVLine(line);
            if (cols.length >= 6) {
                const name = cols[1];
                const safe = getSafeName(name);
                if (!sentSet.has(safe) && !seen.has(safe)) {
                    seen.add(safe);
                    queue.push({
                        company: name,
                        industry: cols[2] || 'Technology',
                        domain: cols[3] || cols[2] || 'Software & Tech',
                        city: cols[4] || 'India',
                        email: cols[5],
                        website: cols[6] || '',
                        priority: 'All-India (Priority 2)'
                    });
                }
            }
        }
    }

    return queue;
}

async function logToApplicationsTracker(company, domain, recipient) {
    try {
        const content = await fs.readFile(APPS_FILE, 'utf-8');
        const lines = content.split('\n');
        
        let lastId = 0;
        for (const line of lines) {
            if (line.startsWith('|') && !line.includes('| # |') && !line.includes('|---|')) {
                const parts = line.split('|').map(s => s.trim()).filter(s => s !== '');
                const num = parseInt(parts[0], 10);
                if (!isNaN(num) && num > lastId) lastId = num;
            }
        }
        
        const newId = lastId + 1;
        const dateStr = new Date().toISOString().split('T')[0];
        const newRow = `| ${newId} | ${dateStr} | ${company} | Software Engineer / AI | 4.20/5 | applied | [PDF](../resume.pdf) | Sent to ${recipient} |`;
        
        await fs.appendFile(APPS_FILE, newRow + '\n', 'utf-8');
    } catch (e) {
        console.warn(`⚠️ Warning: Could not log to applications.md: ${e.message}`);
    }
}

async function runDailyBatch(limit = DAILY_LIMIT, isDryRun = false) {
    console.log("\n==================================================");
    console.log(`🚀 AUTOMATED DAILY CAMPAIGN DISPATCHER ${isDryRun ? '(DRY RUN)' : ''}`);
    console.log(`📅 Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`🔢 Target Batch Size: ${limit} emails`);
    console.log("==================================================");

    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!userEmail || !appPassword || appPassword.includes('xxxx')) {
        console.error("❌ ERROR: Missing or invalid GMAIL_USER / GMAIL_APP_PASSWORD in .env");
        return { success: false, reason: 'auth_missing' };
    }

    try {
        await fs.access(RESUME_PATH);
    } catch {
        console.error(`❌ ERROR: Resume not found at ${RESUME_PATH}`);
        return { success: false, reason: 'resume_missing' };
    }

    const sentSet = await getSentSet();
    const queue = await buildUnifiedQueue(sentSet);

    console.log(`📊 Pipeline Statistics:`);
    console.log(`   - Total Lifetime Sent: ${sentSet.size}`);
    console.log(`   - Fresh Queue Available: ${queue.length} companies`);
    
    const blrRemaining = queue.filter(q => q.priority.includes('Bengaluru')).length;
    const indiaRemaining = queue.filter(q => q.priority.includes('All-India')).length;
    console.log(`   - Phase 1 (Bengaluru remaining): ${blrRemaining}`);
    console.log(`   - Phase 2 (All-India remaining): ${indiaRemaining}\n`);

    if (queue.length === 0) {
        console.log("🎉 ALL STARTUPS IN THE ENTIRE DATABASE HAVE BEEN CONTACTED! Campaign 100% complete.");
        return { success: true, count: 0, completed: true };
    }

    let transporter = null;
    if (!isDryRun) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: userEmail, pass: appPassword }
        });
        await transporter.verify();
        console.log("✅ Gmail Connection Verified. Starting batch...\n");
    }

    let batchSent = 0;
    const batchTargets = queue.slice(0, limit);

    for (let i = 0; i < batchTargets.length; i++) {
        const item = batchTargets[i];
        const { company, domain, email, city, priority } = item;

        const safeName = getSafeName(company);
        const sentMarker = path.join(SENT_DIR, safeName);

        const subject = `Naveen Kumar K M | Software Engineer / SDE Application | Immediate Joiner`;
        const domainMention = domain && domain !== 'nan' ? ` (focusing on ${domain})` : '';
        const body = `Dear Hiring Team at ${company},

I hope this email finds you well.

I am writing to express my strong interest in Software Engineering / AI engineering opportunities at ${company}${domainMention}. I am based in Bengaluru and available to join immediately.

About my background:
- Hands-on Experience: 7 months of AI/ML internship and enterprise SaaS testing experience (including DPDP Act-compliant software PoC setups and defect triage).
- Backend & AI Skills: Python, MySQL, REST APIs, and modern Generative AI workflows (Gemini and OpenAI APIs). Built and deployed 35+ software repositories on GitHub.
- Proven Track Record: 2nd Place runner-up at the Srujana 2025 National Hackathon (felicitated by a former ISRO Chairman).
- Live Projects:
  * Pro Resume Builder (AI document analysis & scoring): https://pro-resume-builder-nine.vercel.app
  * SecureVault (Structured data management for 500+ users): https://cse-tau.vercel.app
  * KrushikaDhara (AI conversational advisory): https://krushika007.vercel.app

I have attached my updated resume for your consideration. I would welcome the opportunity to discuss how my technical skills, fast learning curve, and high ownership can add value to the engineering team at ${company}.

Thank you for your time and consideration.

Best regards,
Naveen Kumar K M
Phone: +91 9591502209 | Email: ${userEmail}
LinkedIn: https://linkedin.com/in/naveenkm07
GitHub: https://github.com/Naveenkm07
Portfolio: https://naveenkm07.netlify.app
Location: Bengaluru, India`;

        console.log(`[${i + 1}/${batchTargets.length}] 📧 [${priority}] Sending to ${company} (${email})...`);

        if (isDryRun) {
            console.log(`   [DRY RUN] Would send to: ${email}`);
            batchSent++;
        } else {
            let attempt = 0;
            let success = false;
            while (attempt < 3 && !success) {
                attempt++;
                try {
                    await transporter.sendMail({
                        from: `"Naveen Kumar K M" <${userEmail}>`,
                        to: email,
                        subject: subject,
                        text: body,
                        attachments: [
                            {
                                filename: 'Naveen_Kumar_KM_Resume.pdf',
                                path: RESUME_PATH
                            }
                        ]
                    });

                    await fs.writeFile(sentMarker, `Sent to ${email} on ${new Date().toISOString()}\nCompany: ${company}\nPriority: ${priority}\n`);
                    await logToApplicationsTracker(company, domain, email);
                    sentSet.add(safeName);
                    batchSent++;
                    success = true;
                    console.log(`   ✅ Delivered to ${company} (${email})!`);

                    // Anti-spam randomized delay: 20-35s
                    if (i < batchTargets.length - 1) {
                        const delaySeconds = Math.floor(Math.random() * (35 - 20 + 1) + 20);
                        console.log(`   ⏳ Pacing delay: waiting ${delaySeconds}s before next email...\n`);
                        await delay(delaySeconds * 1000);
                    }
                } catch (err) {
                    console.error(`   ⚠️ Attempt ${attempt}/3 failed for ${company}: ${err.message}`);
                    if (attempt < 3) {
                        await delay(15000);
                        transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: { user: userEmail, pass: appPassword }
                        });
                    }
                }
            }
        }
    }

    const state = await loadCampaignState();
    const todayStr = new Date().toISOString().split('T')[0];
    state.lastRunDate = todayStr;
    state.sentToday = (state.lastRunDate === todayStr ? (state.sentToday || 0) : 0) + batchSent;
    state.totalSentLifetime = sentSet.size;
    state.currentPhase = blrRemaining - batchSent > 0 ? 'Bengaluru (Phase 1)' : 'All-India (Phase 2)';
    state.history[todayStr] = (state.history[todayStr] || 0) + batchSent;
    await saveCampaignState(state);

    console.log("\n==================================================");
    console.log(`🎉 Daily Batch Completed!`);
    console.log(`   Emails Sent Today: ${batchSent}`);
    console.log(`   Total Lifetime Applications: ${sentSet.size}`);
    console.log(`   Remaining in Pipeline: ${queue.length - batchSent}`);
    console.log("==================================================");

    return { success: true, count: batchSent };
}

async function startDaemon() {
    console.log("==================================================");
    console.log("🤖 DAILY CAMPAIGN AUTOMATION DAEMON STARTED");
    console.log(`⏰ Schedule: Every morning at 09:00 AM IST`);
    console.log(`🎯 Quota: 100 emails/day (Bengaluru first, then All-India)`);
    console.log("==================================================");

    let isRunningBatch = false;

    // Check every 10 minutes
    setInterval(async () => {
        if (isRunningBatch) return;

        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];

        const state = await loadCampaignState();

        // Check if it's 9:00 AM or later and today's quota hasn't been sent yet
        if (hours >= MORNING_HOUR && state.lastRunDate !== todayStr) {
            console.log(`\n🔔 Morning Trigger: It is ${hours}:${minutes.toString().padStart(2, '0')} AM. Launching today's 100 emails batch!`);
            isRunningBatch = true;
            try {
                await runDailyBatch(DAILY_LIMIT, false);
            } catch (err) {
                console.error("❌ Error running daily batch:", err);
            } finally {
                isRunningBatch = false;
            }
        } else {
            const nextTrigger = state.lastRunDate === todayStr ? "Already completed today. Next trigger tomorrow at 09:00 AM IST." : `Waiting for 09:00 AM IST (Current: ${hours}:${minutes.toString().padStart(2, '0')}).`;
            // Silent keep-alive log every hour
            if (minutes % 30 === 0) {
                console.log(`[Daemon Heartbeat ${now.toLocaleTimeString()}] Status: ${nextTrigger}`);
            }
        }
    }, 10 * 60 * 1000); // 10 minutes check

    // Initial check on boot
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hours = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    const state = await loadCampaignState();
    
    if (hours >= MORNING_HOUR && state.lastRunDate !== todayStr) {
        console.log(`⚡ Daemon booted after 9:00 AM and today's batch hasn't run yet. Starting now!`);
        isRunningBatch = true;
        try {
            await runDailyBatch(DAILY_LIMIT, false);
        } finally {
            isRunningBatch = false;
        }
    } else {
        console.log(`⏳ Daemon active and waiting for next scheduled run at 09:00 AM IST.`);
    }
}

async function showStatus() {
    const sentSet = await getSentSet();
    const queue = await buildUnifiedQueue(sentSet);
    const state = await loadCampaignState();

    const blrRemaining = queue.filter(q => q.priority.includes('Bengaluru')).length;
    const indiaRemaining = queue.filter(q => q.priority.includes('All-India')).length;
    const daysLeft = Math.ceil(queue.length / DAILY_LIMIT);

    console.log("==================================================");
    console.log("📊 CAMPAIGN AUTOMATION STATUS REPORT");
    console.log("==================================================");
    console.log(`Total Applications Sent & Tracked: ${sentSet.size}`);
    console.log(`Phase 1 - Bengaluru Startups Left: ${blrRemaining} companies (~${Math.ceil(blrRemaining / DAILY_LIMIT)} days)`);
    console.log(`Phase 2 - All-India Startups Left: ${indiaRemaining} companies (~${Math.ceil(indiaRemaining / DAILY_LIMIT)} days)`);
    console.log(`Total Combined Pipeline Remaining: ${queue.length} companies (~${daysLeft} days total)`);
    console.log(`Daily Quota: ${DAILY_LIMIT} emails/morning`);
    console.log(`Last Batch Date: ${state.lastRunDate || 'None yet'}`);
    console.log(`Today Sent: ${state.sentToday || 0} / ${DAILY_LIMIT}`);
    console.log("==================================================");
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--status')) {
        await showStatus();
    } else if (args.includes('--dry-run')) {
        await runDailyBatch(10, true);
    } else if (args.includes('--run-now')) {
        const limitArg = args.find(a => a.startsWith('--limit='));
        const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : DAILY_LIMIT;
        await runDailyBatch(limit, false);
    } else if (args.includes('--daemon')) {
        await startDaemon();
    } else {
        await showStatus();
        console.log("\nUsage:");
        console.log("  node auto-daily-campaign.mjs --daemon     (Run background automation every morning at 9am)");
        console.log("  node auto-daily-campaign.mjs --run-now    (Dispatch today's 100 batch immediately)");
        console.log("  node auto-daily-campaign.mjs --status     (View pipeline progress and stats)");
        console.log("  node auto-daily-campaign.mjs --dry-run    (Simulate next 10 emails without sending)");
    }
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
