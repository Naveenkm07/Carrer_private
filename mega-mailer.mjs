import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const MEGA_DIR = 'output/mega_3000_blast';
const SENT_DIR = path.join(MEGA_DIR, '_SENT');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("🚀 Launching Mega 3000+ Auto-Mailer...");
    
    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!userEmail || !appPassword) {
        console.error("❌ ERROR: Missing GMAIL_USER or GMAIL_APP_PASSWORD.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: userEmail, pass: appPassword }
    });

    try {
        await transporter.verify();
        console.log("✅ Connection Verified.");
        await fs.mkdir(SENT_DIR, { recursive: true });
    } catch (error) {
        console.error("❌ Connection Failed.");
        return;
    }

    while (true) {
        try {
            const entries = await fs.readdir(MEGA_DIR);
            const companies = entries.filter(e => !e.startsWith('_') && !e.startsWith('.'));
            
            if (companies.length === 0) {
                console.log("😴 All currently queued applications sent. Waiting for more...");
                await delay(600000); // 10 mins
                continue;
            }

            console.log(`\n📊 Mega Queue: ${companies.length} applications remaining.`);
            
            for (const company of companies) {
                const companyDir = path.join(MEGA_DIR, company);
                let stats;
                try {
                    stats = await fs.stat(companyDir);
                } catch (e) { continue; }
                
                if (!stats.isDirectory()) continue;
                
                const emailPath = path.join(companyDir, 'email.txt');
                const pdfFile = (await fs.readdir(companyDir)).find(f => f.endsWith('.pdf'));
                
                if (!pdfFile) continue;

                try {
                    const emailRaw = await fs.readFile(emailPath, 'utf-8');
                    const lines = emailRaw.split('\n');
                    const toAddress = lines.find(l => l.startsWith('TO: ')).replace('TO: ', '').trim();
                    const subject = lines.find(l => l.startsWith('SUBJECT: ')).replace('SUBJECT: ', '').trim();
                    const body = emailRaw.substring(emailRaw.indexOf('\n\n') + 2);
                    
                    console.log(`\n📧 Mega Blast -> ${company} (${toAddress})...`);
                    
                    await transporter.sendMail({
                        from: `"Naveen Kumar K M" <${userEmail}>`,
                        to: toAddress,
                        subject: subject,
                        text: body,
                        attachments: [{ filename: `Naveen_Kumar_K_M_Resume.pdf`, path: path.join(companyDir, pdfFile) }]
                    });
                    
                    console.log(`✅ Sent!`);
                    await fs.rename(companyDir, path.join(SENT_DIR, company));
                    
                    // Safety delay 2-5 mins
                    const waitTime = Math.floor(Math.random() * (300000 - 120000 + 1) + 120000);
                    console.log(`⏳ Safety Delay: ${Math.round(waitTime/1000)}s...`);
                    await delay(waitTime);
                    
                } catch (err) {
                    console.error(`❌ Failed ${company}:`, err.message);
                    // Move to failed if it keeps failing? For now just skip.
                }
            }
        } catch (error) {
            console.error("Loop Error:", error);
            await delay(60000);
        }
    }
}

main();
