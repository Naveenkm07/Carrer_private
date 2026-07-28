import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const MASS_DIR = 'output/mass_bengaluru_blast';

async function main() {
    const entries = await fs.readdir(MASS_DIR);
    const companies = entries.filter(e => !e.startsWith('_') && !e.startsWith('.'));

    console.log(`🚀 Generating PDFs for ${companies.length} companies...`);

    for (const company of companies) {
        const companyDir = path.join(MASS_DIR, company);
        let stats;
        try {
            stats = await fs.stat(companyDir);
        } catch (e) {
            continue; // Skip if already moved by mailer
        }
        
        if (!stats.isDirectory()) continue;

        const htmlFile = (await fs.readdir(companyDir)).find(f => f.endsWith('.html'));
        if (!htmlFile) continue;

        const inputPath = path.join(companyDir, htmlFile);
        const outputPath = path.join(companyDir, `cv-Naveen-Kumar-K-M-${company}.pdf`);

        console.log(`\n[${company}]`);
        try {
            execSync(`node generate-pdf.mjs "${inputPath}" "${outputPath}"`, { stdio: 'inherit' });
        } catch (err) {
            console.error(`❌ Failed for ${company}: ${err.message}`);
        }
    }

    console.log("\n🎉 All PDFs generated in output/mass_bengaluru_blast/");
}

main();
