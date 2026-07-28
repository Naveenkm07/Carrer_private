import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const MARKDOWN_PATH = 'data/bangalore_hr_emails.md';
const OUTPUT_DIR = 'output/bulk_campaign';
const TEMPLATE_PATH = 'output/cv-innoknowvex.html'; // Single standard template

async function main() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        const mdContent = await fs.readFile(MARKDOWN_PATH, 'utf-8');
        
        const regex = /\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/g;
        
        let match;
        let count = 0;
        
        console.log("🚀 Starting Bulk Generation (Single Resume Strategy)...");

        while ((match = regex.exec(mdContent)) !== null) {
            const companyName = match[1].trim();
            const email = match[2].trim();
            const role = match[3].trim();
            
            const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
            const companyDir = path.join(OUTPUT_DIR, safeCompanyName);
            const sentPath = path.join(OUTPUT_DIR, '_SENT', safeCompanyName);
            
            // SKIP IF ALREADY SENT
            try {
                await fs.access(sentPath);
                // console.log(`⏭️ Skipping ${companyName}: Already in _SENT.`);
                continue;
            } catch (e) {
                // Proceed
            }

            await fs.mkdir(companyDir, { recursive: true });
            
            const pdfPath = path.join(companyDir, `Naveen_Kumar_Resume.pdf`);
            
            // Skip if PDF already exists in company folder
            try {
                await fs.access(pdfPath);
                // console.log(`⏩ PDF exists for ${companyName}.`);
            } catch (e) {
                console.log(`\n[${count + 1}] Generating Resume for ${companyName}...`);
                // Note: We use the static template directly
                execSync(`node generate-pdf.mjs "${TEMPLATE_PATH}" "${pdfPath}" --format=a4`, { stdio: 'inherit' });
            }

            count++;
            
            // Log progress every 50
            if (count % 50 === 0) {
                console.log(`\n📈 Progress: ${count} resumes processed...`);
            }
        }
        
        console.log(`\n✅ Bulk Generation complete! Total: ${count} companies ready.`);
        
    } catch (error) {
        console.error("Error in batch generation:", error);
    }
}

main();
