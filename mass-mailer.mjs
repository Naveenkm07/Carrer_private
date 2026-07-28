import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const MASS_DIR = 'output/mass_bengaluru_blast';
const SENT_DIR = path.join(MASS_DIR, '_SENT');

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("🚀 Starting Mass Bengaluru Auto-Mailer (WATCH MODE)...");
    
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
        console.log("✅ Gmail Connection Verified.");
        await fs.mkdir(SENT_DIR, { recursive: true });
    } catch (error) {
        console.error("❌ Connection Failed.");
        return;
    }

    while (true) {
        try {
            const entries = await fs.readdir(MASS_DIR);
            const companies = entries.filter(e => !e.startsWith('_') && !e.startsWith('.'));
            
            if (companies.length === 0) {
                console.log("😴 No pending applications. Waiting 10 minutes...");
                await delay(600000); // 10 mins
                continue;
            }

            console.log(`\n📊 Status: ${companies.length} mass applications pending.`);
            
            for (const company of companies) {
                const companyDir = path.join(MASS_DIR, company);
                const stats = await fs.stat(companyDir);
                if (!stats.isDirectory()) continue;
                
                const emailPath = path.join(companyDir, 'email.txt');
                const pdfFile = (await fs.readdir(companyDir)).find(f => f.endsWith('.pdf'));
                
                if (!pdfFile) {
                    console.log(`⚠️ Skipping ${company}: No PDF.`);
                    continue;
                }

                try {
                    const emailRaw = await fs.readFile(emailPath, 'utf-8');
                    const lines = emailRaw.split('\n');
                    const toAddress = lines.find(l => l.startsWith('TO: ')).replace('TO: ', '').trim();
                    const subject = lines.find(l => l.startsWith('SUBJECT: ')).replace('SUBJECT: ', '').trim();
                    const body = emailRaw.substring(emailRaw.indexOf('\n\n') + 2);
                    
                    console.log(`\n📧 Sending to ${company}...`);
                    
                    await transporter.sendMail({
                        from: `"Naveen Kumar K M" <${userEmail}>`,
                        to: toAddress,
                        subject: subject,
                        text: body,
                        attachments: [
                            {
                                filename: `Naveen_Kumar_K_M_Resume.pdf`,
                                path: path.join(companyDir, pdfFile)
                            }
                        ]
                    });
                    
                    console.log(`✅ Sent!`);
                    await fs.rename(companyDir, path.join(SENT_DIR, company));
                    
                    // Safety delay 2-5 mins
                    const waitTime = Math.floor(Math.random() * (300000 - 120000 + 1) + 120000);
                    console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s...`);
                    await delay(waitTime);
                    
                } catch (err) {
                    console.error(`❌ Failed ${company}:`, err.message);
                }
            }
        } catch (error) {
            console.error("Error in loop:", error);
            await delay(60000); // Wait a min before retry
        }
    }
}

main();
