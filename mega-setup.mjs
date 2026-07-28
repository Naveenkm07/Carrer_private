import fs from 'fs/promises';
import path from 'path';

const INPUT_FILE = 'data/massive_bengaluru_outreach.md';
const OUTPUT_DIR = 'output/mega_3000_blast';
const MASTER_RESUME_PDF = 'output/master_resume_naveen.pdf';

async function main() {
    console.log("🚀 Initializing Mega 3000+ Outreach Campaign...");
    
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 1. Read existing contacts
    const content = await fs.readFile(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');
    const companies = [];

    for (const line of lines) {
        if (line.includes('|') && !line.includes('Company Name') && !line.includes('---')) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p);
            if (parts.length >= 2) {
                companies.push({ name: parts[0], email: parts[1] });
            }
        }
    }

    console.log(`📊 Loaded ${companies.length} existing verified contacts.`);

    // 2. Add Top 500 Guessing Logic
    const topStartups = [
        "PhonePe", "Lenskart", "Ola Electric", "Byjus", "Swiggy", "Dream11", "Razorpay", 
        "Postman", "Cred", "Meesho", "Unacademy", "Pine Labs", "Nykaa", "Zomato", 
        "Freshworks", "Groww", "Upstox", "Delhivery", "BigBasket", "PolicyBazaar", 
        "Zerodha", "InMobi", "BrowserStack", "Chargebee", "Digit Insurance", "ElasticRun",
        "Kuku FM", "Pocket FM", "Stage", "WinZO", "MPL", "Games24x7", "Zupee", 
        "Junglee Games", "Nazara", "JetSynthesys", "Nodwin Gaming", "Shadowfax", "Porter"
    ];

    for (const name of topStartups) {
        const domain = name.toLowerCase().replace(/\s+/g, '') + ".com";
        companies.push({ name: name, email: `careers@${domain}` });
        companies.push({ name: name, email: `hr@${domain}` });
    }

    console.log(`📊 Total targeting queue: ${companies.length} companies.`);

    // 3. Setup Folders
    for (const company of companies) {
        const safeName = company.name.replace(/[^a-z0-9]/gi, '_');
        const companyDir = path.join(OUTPUT_DIR, safeName);
        
        // We handle multiple emails per company by appending a hash or index if needed, 
        // but for now, the mailer will just process safeName folders.
        // If two emails for one company, let's make them unique.
        const uniqueDir = path.join(OUTPUT_DIR, `${safeName}_${company.email.split('@')[0]}`);
        await fs.mkdir(uniqueDir, { recursive: true });

        // Copy Master PDF
        await fs.copyFile(MASTER_RESUME_PDF, path.join(uniqueDir, 'Naveen_Kumar_K_M_Resume.pdf'));

        // Create Email Draft
        const emailContent = `TO: ${company.email}
SUBJECT: Application for Python / AI-ML / Backend Roles - Naveen Kumar K M

Dear Hiring Team at ${company.name},

I am Naveen Kumar K M, a Computer Science student with 7 months of AI/ML internship experience and hands-on expertise in Python, SQL, and ML workflows (scikit-learn, TensorFlow).

Key Highlights:
- 7 months AI/ML Internship (Model development & optimization).
- 10+ Hackathons (National-level Leadership).
- 70+ GitHub Repositories (CI/CD, Python, SQL).
- CGPA: 8.56 (NHCE).

I have attached my high-density 1-page resume for your review. I am available for an interview immediately.

Best regards,
Naveen Kumar K M
Phone: +91 [YOUR_PHONE]
GitHub: https://github.com/Naveenkm07
Portfolio: https://cse-tau.vercel.app`;

        await fs.writeFile(path.join(uniqueDir, 'email.txt'), emailContent);
    }

    console.log("\n✅ Mega Blast setup complete! All folders have the Master PDF.");
    console.log("Next: Start the dedicated mega-mailer.");
}

main();
