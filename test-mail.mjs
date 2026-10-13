import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log("🚀 Running Email Test...");
    
    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!userEmail || !appPassword || appPassword.includes('xxxx')) {
        console.error("❌ ERROR: Missing or placeholder GMAIL_USER or GMAIL_APP_PASSWORD in .env");
        console.log("Please set valid credentials in .env:");
        console.log("  GMAIL_USER=your.email@gmail.com");
        console.log("  GMAIL_APP_PASSWORD=your_16_digit_app_password");
        return;
    }
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: userEmail,
            pass: appPassword
        }
    });

    try {
        console.log("⏳ Verifying Gmail SMTP connection...");
        await transporter.verify();
        console.log("✅ Gmail Connection Verified!");

        // Check for resume.pdf
        const resumePath = path.resolve('resume.pdf');
        let attachments = [];
        try {
            await fs.access(resumePath);
            attachments.push({
                filename: 'Naveen_Kumar_KM_Resume.pdf',
                path: resumePath
            });
            console.log(`📎 Found resume attachment: ${resumePath}`);
        } catch {
            console.log("ℹ️ No resume.pdf found to attach; sending text-only test email.");
        }

        console.log(`📧 Sending TEST EMAIL to ${userEmail}...`);

        await transporter.sendMail({
            from: `"Naveen Kumar K M" <${userEmail}>`,
            to: userEmail, // Sending to yourself
            subject: `[Career-Ops Test] Gmail Connection Verified`,
            text: `Hi Naveen,\n\nThis is a test email confirming that your Career-Ops Gmail connection is working properly.\n\nTime: ${new Date().toLocaleString()}\nSender: ${userEmail}\nResume attached: ${attachments.length > 0 ? 'Yes' : 'No'}\n\nBest regards,\nCareer-Ops Pipeline`,
            attachments: attachments
        });

        console.log("\n✅ TEST EMAIL SENT SUCCESSFULLY!");
        console.log(`Please check your inbox (${userEmail}) and Spam folder.`);
        
    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
        if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
            console.error("💡 Tip: Make sure you are using a 16-character Google App Password (not your normal Google account password), with 2-Step Verification enabled.");
        }
    }
}

main();
