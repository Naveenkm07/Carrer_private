import markdown
import asyncio
from playwright.async_api import async_playwright

def md_to_pdf(md_file, pdf_file):
    with open(md_file, 'r', encoding='utf-8') as f:
        md_text = f.read()
    
    # Convert Markdown to HTML
    html = markdown.markdown(md_text, extensions=['extra', 'tables'])
    
    # Wrap in basic CSS for ATS-friendly formatting
    styled_html = f"""
    <html>
    <head>
    <style>
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5; margin: 40px; font-size: 12px; }}
        h1 {{ font-size: 24px; margin-bottom: 5px; text-align: center; }}
        p {{ margin: 5px 0; text-align: center; }}
        h2 {{ font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }}
        ul {{ margin-top: 5px; margin-bottom: 10px; padding-left: 20px; }}
        li {{ margin-bottom: 4px; }}
        strong {{ font-weight: bold; }}
    </style>
    </head>
    <body>
    {html}
    </body>
    </html>
    """
    
    async def run():
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.set_content(styled_html)
            await page.pdf(path=pdf_file, format="A4", print_background=True, margin={"top": "20px", "bottom": "20px", "left": "20px", "right": "20px"})
            await browser.close()
            
    asyncio.run(run())
    print(f"Successfully generated {pdf_file}")

if __name__ == "__main__":
    md_to_pdf("Mobile_Developer_ATS_Resume.md", "Mobile_Developer_ATS_Resume.pdf")
    md_to_pdf("AI_ML_Engineer_ATS_Resume.md", "AI_ML_Engineer_ATS_Resume.pdf")
