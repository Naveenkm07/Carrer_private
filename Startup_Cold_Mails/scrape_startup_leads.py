import requests
import re
import csv
import time
from urllib.parse import urlparse

# We will use the 'googlesearch-python' package to find startup websites
try:
    from googlesearch import search
except ImportError:
    print("Please install googlesearch-python: pip install googlesearch-python")
    exit()

def get_emails_from_domain(domain):
    emails = set()
    try:
        # Check standard paths
        urls_to_check = [
            f"http://{domain}",
            f"http://{domain}/contact",
            f"http://{domain}/about",
            f"http://{domain}/careers"
        ]
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        
        for url in urls_to_check:
            try:
                response = requests.get(url, headers=headers, timeout=5)
                # Simple regex to find emails
                found = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', response.text)
                for email in found:
                    # filter out common false positives (like .png or wixpress)
                    if not email.endswith(('.png', '.jpg', '.jpeg', '.gif', 'sentry.io')):
                        emails.add(email)
            except Exception:
                pass
    except Exception:
        pass
    
    return list(emails)

def main():
    query = '"HSR Layout" "Bangalore" "startup" OR "software" OR "IT" contact email'
    
    csv_file = "Bengaluru_Startup_Leads_Format.csv"
    
    print(f"Starting web search for startups in HSR Layout...")
    print("This will take time as it searches and scrapes websites one by one.")
    print("Goal: Collect as many leads as possible. Run this overnight for best results.\n")
    
    count = 0
    with open(csv_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Searching Google for 100+ results to start finding domains
        # To get 800, we would need to run many variations of queries.
        try:
            for url in search(query, num_results=100, sleep_interval=2):
                domain = urlparse(url).netloc
                if not domain or 'justdial' in domain or 'linkedin' in domain or 'glassdoor' in domain or 'wellfound' in domain:
                    continue # Skip directories
                
                domain = domain.replace('www.', '')
                print(f"Scanning domain: {domain}")
                
                emails = get_emails_from_domain(domain)
                if emails:
                    print(f"  -> Found {len(emails)} emails: {emails}")
                    # Write to CSV
                    for email in emails:
                        # Area, Role, Company, Contact, Email, LinkedIn, Status, Notes
                        writer.writerow(['HSR Layout', 'Tech/HR', domain, 'Unknown', email, '', 'Pending', 'Scraped via script'])
                        count += 1
                        
                time.sleep(1) # Be polite
                
        except Exception as e:
            print(f"Search stopped: {e}")
            
    print(f"\nFinished! Added {count} new emails to {csv_file}")

if __name__ == "__main__":
    main()
