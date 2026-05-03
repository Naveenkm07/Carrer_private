import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';

// Create a dummy web server so Render.com thinks this is a web app
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mailer is running!\n');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Dummy web server listening on port ${PORT}`);
});

dotenv.config();

const MARKDOWN_PATH = 'data/bangalore_hr_emails.md';
const OUTPUT_DIR = 'output/bulk_campaign';
const SENT_DIR = path.join(OUTPUT_DIR, '_SENT');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const STANDARD_SUBJECT = "Naveen Kumar K M | Software Engineer | Immediate Joiner";
const STANDARD_MESSAGE = `Hi Hiring Team,

I’m Naveen, a CSE student with deep experience in Python, Flask, and AI/ML. I am very interested in the tech team at your company.

I’ve built a Secure Data Management System (Flask/SQL) and over 70+ projects on GitHub. I’m an immediate joiner, a fast learner, and ready to contribute from Day 1.

I have attached my resume for your review. Would love to discuss how my skills in software engineering and backend development can help your team.

Best regards,
Naveen Kumar K M
+91 9591502209 | kmnaveenkm85@gmail.com
[LinkedIn](https://linkedin.com/in/naveenkm07) | [GitHub](https://github.com/Naveenkm07) | [Portfolio](https://naveenkm07.netlify.app)`;

async function sendMail(to, companyName) {
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const resumePath = 'resume_ai_07.pdf';

    try {
        await fs.access(resumePath);
    } catch (e) {
        console.error(`❌ Resume not found: ${resumePath}`);
        return false;
    }

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: to,
        subject: STANDARD_SUBJECT,
        text: STANDARD_MESSAGE,
        attachments: [
            {
                filename: 'Naveen_Kumar_KM_Resume.pdf',
                path: resumePath
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        // Mark as sent
        await fs.mkdir(SENT_DIR, { recursive: true });
        await fs.writeFile(path.join(SENT_DIR, safeCompanyName), `Sent to ${to} on ${new Date().toISOString()}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending to ${companyName}:`, error.message);
        return false;
    }
}

async function main() {
    try {
        const mdContent = await fs.readFile(MARKDOWN_PATH, 'utf-8');
        const regex = /\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/g;
        
        let match;
        let count = 0;
        
        console.log("🚀 Starting Standard Bulk Mailer...");

        while ((match = regex.exec(mdContent)) !== null) {
            const companyName = match[1].trim();
            const email = match[2].trim();
            const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
            
            // Check if already sent
            try {
                await fs.access(path.join(SENT_DIR, safeCompanyName));
                continue; // Skip
            } catch (e) {
                // Proceed
            }

            console.log(`\n[Queue] Processing ${companyName} (${email})...`);
            const success = await sendMail(email, companyName);
            
            if (success) {
                count++;
                console.log(`✅ Email sent to ${companyName}!`);
                
                // Safety delay: 2 to 5 minutes
                const delay = Math.floor(Math.random() * (300000 - 120000 + 1) + 120000);
                console.log(`⏳ Waiting ${Math.round(delay/1000)} seconds to prevent spam detection...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`\n🎉 Campaign finished! ${count} new emails sent.`);
        
    } catch (error) {
        console.error("Mailer Error:", error);
    }
}

main();
