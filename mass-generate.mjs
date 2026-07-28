import fs from 'fs/promises';
import path from 'path';

const INPUT_FILE = 'data/massive_bengaluru_outreach.md';
const OUTPUT_DIR = 'output/mass_bengaluru_blast';
const TEMPLATE_FILE = 'templates/cv-template.html';

async function generate() {
    console.log("🚀 Starting Mass Generation for Bengaluru...");
    
    const content = await fs.readFile(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');
    const companies = [];

    for (const line of lines) {
        if (line.includes('|') && !line.includes('Company Name') && !line.includes('---')) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p);
            if (parts.length >= 2) {
                companies.push({ name: parts[0], email: parts[1], type: parts[2] || 'IT' });
            }
        }
    }

    console.log(`📊 Found ${companies.length} companies.`);

    const htmlTemplate = await fs.readFile(TEMPLATE_FILE, 'utf-8');

    for (const company of companies) {
        const safeName = company.name.replace(/[^a-z0-9]/gi, '_');
        const companyDir = path.join(OUTPUT_DIR, safeName);
        await fs.mkdir(companyDir, { recursive: true });

        // Tailor HTML (Simple name replacement)
        const tailoredHtml = htmlTemplate.replace(/\[Company\]/g, company.name);
        await fs.writeFile(path.join(companyDir, `cv-${safeName}.html`), tailoredHtml);

        // Create Email Draft
        const emailContent = `TO: ${company.email}
SUBJECT: Application for Python / AI-ML / Backend Roles - Naveen Kumar K M

Dear Hiring Team at ${company.name},

I am writing to express my strong interest in Python Developer, AI/ML, or Backend Engineering roles at ${company.name}. 

As a CSE student with 7 months of focused AI/ML internship experience and hands-on expertise in Python, SQL, and ML workflows (scikit-learn, TensorFlow), I am confident in my ability to contribute to your technical team.

Key Highlights:
- 7 months AI/ML Internship (Model development & optimization).
- 10+ Hackathons (Leadership & Project Coordination).
- 70+ GitHub Repositories (CI/CD, Python, SQL).
- CGPA: 8.56 (New Horizon College of Engineering).

I have attached my 1-page resume for your review. I am available for an interview at your earliest convenience and can join immediately.

Best regards,

Naveen Kumar K M
Phone: +91 [YOUR_PHONE]
GitHub: https://github.com/Naveenkm07
Portfolio: https://cse-tau.vercel.app`;

        await fs.writeFile(path.join(companyDir, 'email.txt'), emailContent);
        console.log(`✅ Drafted ${company.name}`);
    }

    console.log("\n🎉 Generation complete! Now run: node generate-pdf.mjs mass-blast");
}

generate();
