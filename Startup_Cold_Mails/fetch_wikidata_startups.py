import requests
import csv
import re
from urllib.parse import urlparse

# Wikidata SPARQL endpoint
url = 'https://query.wikidata.org/sparql'
query = """
SELECT ?companyLabel ?website WHERE {
  ?company wdt:P31/wdt:P279* wd:Q4830453. 
  ?company wdt:P159 wd:Q1355. 
  OPTIONAL { ?company wdt:P856 ?website. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
LIMIT 2000
"""
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BangaloreStartupBot/1.0',
    'Accept': 'application/json'
}

print("Querying Wikidata for businesses headquartered in Bangalore...")

try:
    response = requests.get(url, params={'query': query}, headers=headers, timeout=15)
    data = response.json()
    results = data.get('results', {}).get('bindings', [])
    
    count = 0
    csv_file = "Bengaluru_Startup_Leads_Format.csv"
    
    with open(csv_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        for item in results:
            name = item.get('companyLabel', {}).get('value', '')
            website = item.get('website', {}).get('value', '')
            
            # Skip if name is a Q-code (missing English label)
            if re.match(r'^Q\d+', name):
                continue
                
            domain = ""
            if website:
                parsed = urlparse(website)
                domain = parsed.netloc.replace('www.', '')
            else:
                domain = f"{re.sub(r'[^a-zA-Z0-9]', '', name).lower()}.com"
                
            if len(domain) > 3 and '.' in domain:
                email = f"careers@{domain}"
                writer.writerow(['Bangalore (Wikidata)', 'HR/Careers', name, 'HR Team', email, '', 'Pending', 'From Wikidata Registry'])
                count += 1
                
    print(f"Successfully added {count} companies from Bangalore to your CSV!")
except Exception as e:
    print(f"Error occurred: {e}")
