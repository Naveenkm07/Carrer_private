import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log("🚀 Running Email Test...");
    
    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: userEmail,
            pass: appPassword
        }
    });

    try {
        await transporter.verify();
        console.log("✅ Connection Verified.");
        
        // Let's grab the Infosys assets for the test
        const companyDir = 'output/bulk_campaign/Infosys';
        const emailPath = path.join(companyDir, 'email.txt');
        const pdfPath = path.join(companyDir, 'cv-Naveen-Kumar-K-M-Infosys.pdf');
        
        const emailRaw = await fs.readFile(emailPath, 'utf-8');
        const lines = emailRaw.split('\n');
        const subject = lines.find(l => l.startsWith('SUBJECT: ')).replace('SUBJECT: ', '').trim();
        const body = emailRaw.substring(emailRaw.indexOf('\n\n') + 2);

        console.log(`📧 Sending TEST EMAIL to ${userEmail}...`);

        await transporter.sendMail({
            from: `"Naveen Kumar K M" <${userEmail}>`,
            to: userEmail, // Sending to yourself
            subject: `[TEST] ${subject}`,
            text: body,
            attachments: [
                {
                    filename: `Naveen_Kumar_K_M_Resume.pdf`,
                    path: pdfPath
                }
            ]
        });

        console.log("\n✅ TEST EMAIL SENT SUCCESSFULLY!");
        console.log("Please check your inbox (and Spam folder just in case).");
        
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
    }
}

main();
