import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const csvArg = process.argv.find(arg => arg.startsWith('--csv='));
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const maxEmails = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

const CSV_PATH = csvArg ? path.resolve(csvArg.split('=')[1]) : path.resolve('data', 'HSR_Layout_AI_Startups_100.csv');
const RESUME_PATH = path.resolve('resume.pdf');
const SENT_DIR = path.resolve('output', 'hsr_campaign', '_SENT');
const APPS_FILE = path.resolve('data', 'applications.md');

const isDryRun = process.argv.includes('--dry-run');

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

async function logToApplicationsTracker(company, role, recipient) {
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

async function main() {
    console.log("==================================================");
    console.log(`🚀 HSR Layout Startups Mailer ${isDryRun ? '(DRY RUN MODE)' : '(LIVE SENDING MODE)'}`);
    console.log(`📂 Target CSV: ${CSV_PATH}`);
    if (maxEmails !== Infinity) console.log(`🔢 Sending Limit: ${maxEmails}`);
    console.log("==================================================");

    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!userEmail || !appPassword || appPassword.includes('xxxx')) {
        console.error("❌ ERROR: Missing or invalid GMAIL_USER / GMAIL_APP_PASSWORD in .env");
        process.exit(1);
    }

    // Verify resume exists
    try {
        await fs.access(RESUME_PATH);
        console.log(`✅ Resume found: ${RESUME_PATH}`);
    } catch {
        console.error(`❌ ERROR: Resume not found at ${RESUME_PATH}`);
        process.exit(1);
    }

    // Parse CSV
    const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    const isSixColumn = headerLine.includes('#') && headerLine.includes('Company Name');

    const rawRows = lines.slice(1).map(parseCSVLine);
    const rows = rawRows.map(cols => {
        if (isSixColumn) {
            // [#, Company Name, AI Focus / Domain, Careers Page / Website, Email Address (HR / Careers), Location]
            return {
                company: cols[1],
                domain: cols[2],
                careersUrl: cols[3],
                email: cols[4],
                location: cols[5]
            };
        } else {
            // [Company Name, Typical Roles, Careers Page, Email, Location]
            return {
                company: cols[0],
                domain: cols[1],
                careersUrl: cols[2],
                email: cols[3],
                location: cols[4]
            };
        }
    });

    console.log(`📋 Found ${rows.length} startups in list.\n`);

    await fs.mkdir(SENT_DIR, { recursive: true });

    let transporter = null;
    if (!isDryRun) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: userEmail, pass: appPassword }
        });

        console.log("⏳ Verifying Gmail connection...");
        await transporter.verify();
        console.log("✅ Gmail Connection Verified!\n");
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
        if (sentCount >= maxEmails) {
            console.log(`\n🛑 Reached batch limit of ${maxEmails} emails. Pausing current batch.`);
            break;
        }

        const { company, domain, careersUrl, email, location } = rows[i];
        if (!company || !email || !email.includes('@')) continue;

        const safeCompanyName = company.replace(/[^a-zA-Z0-9]/g, '_');
        const sentMarker = path.join(SENT_DIR, safeCompanyName);

        // Check if already sent
        try {
            await fs.access(sentMarker);
            console.log(`[${i + 1}/${rows.length}] ⏭️  Skipping ${company}: Already sent previously.`);
            skippedCount++;
            continue;
        } catch {
            // Not sent yet
        }

        const subject = `Naveen Kumar K M | Software Engineer / SDE Application | Immediate Joiner`;
        const domainMention = domain ? ` (particularly in ${domain})` : '';
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

        console.log(`[${i + 1}/${rows.length}] 📧 Preparing email to ${company} (${email})...`);

        if (isDryRun) {
            console.log(`   [DRY RUN] Subject: "${subject}"`);
            console.log(`   [DRY RUN] Attachment: Naveen_Kumar_KM_Resume.pdf (${RESUME_PATH})`);
            console.log(`   [DRY RUN] Would send to: ${email}`);
            sentCount++;
        } else {
            let attempt = 0;
            let success = false;
            const maxAttempts = 3;

            while (attempt < maxAttempts && !success) {
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

                    // Mark as sent
                    await fs.writeFile(sentMarker, `Sent to ${email} on ${new Date().toISOString()}\nCompany: ${company}\n`);
                    await logToApplicationsTracker(company, domain, email);
                    sentCount++;
                    success = true;
                    console.log(`   ✅ Sent successfully to ${company} (${email})!`);

                    // Anti-spam rate limiting: 20-35 seconds delay between emails
                    if (i < rows.length - 1) {
                        const delaySeconds = Math.floor(Math.random() * (35 - 20 + 1) + 20);
                        console.log(`   ⏳ Pacing delay: waiting ${delaySeconds}s before next email...\n`);
                        await delay(delaySeconds * 1000);
                    }
                } catch (err) {
                    console.error(`   ⚠️ Attempt ${attempt}/${maxAttempts} failed for ${company} (${email}): ${err.message}`);
                    if (attempt < maxAttempts) {
                        console.log(`   ⏳ Waiting 15s before retry...`);
                        await delay(15000);
                        // Recreate transporter in case connection broke
                        transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: { user: userEmail, pass: appPassword }
                        });
                    } else {
                        console.error(`   ❌ Failed sending to ${company} (${email}) after ${maxAttempts} attempts.\n`);
                    }
                }
            }
        }
    }

    console.log("\n==================================================");
    console.log(`🎉 Campaign Summary:`);
    console.log(`   Total in list: ${rows.length}`);
    console.log(`   Processed/Sent: ${sentCount}`);
    console.log(`   Already Sent/Skipped: ${skippedCount}`);
    console.log("==================================================");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
