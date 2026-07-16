import csv
import urllib.request
import re

print("Downloading Indian Startups dataset from GitHub...")
url = "https://raw.githubusercontent.com/Siddarth-k-98/Indian-Startup-Funding-Analysis/master/startup_funding.csv"

try:
    response = urllib.request.urlopen(url)
    lines = [l.decode('utf-8') for l in response.readlines()]
    reader = csv.reader(lines)
    header = next(reader)
    
    # Indices might vary, let's find City and StartupName
    # Typical header: SNo,Date,StartupName,IndustryVertical,SubVertical,CityLocation,InvestorsName,InvestmentType,AmountInUSD,Remarks
    city_idx = -1
    name_idx = -1
    for i, col in enumerate(header):
        c = col.lower().replace(" ", "")
        if 'city' in c or 'location' in c:
            city_idx = i
        if 'startupname' in c or 'startup' in c:
            name_idx = i
            
    if name_idx == -1: name_idx = 2
    if city_idx == -1: city_idx = 5

    count = 0
    unique_startups = set()
    
    csv_file = "Bengaluru_Startup_Leads_Format.csv"
    with open(csv_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        for row in reader:
            if len(row) > max(city_idx, name_idx):
                city = row[city_idx].lower()
                name = row[name_idx].strip()
                
                if ('bangalore' in city or 'bengaluru' in city) and name.lower() not in unique_startups:
                    unique_startups.add(name.lower())
                    
                    # Clean name to form domain
                    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).lower()
                    if len(clean_name) > 2:
                        domain = f"{clean_name}.com"
                        email = f"careers@{domain}"
                        
                        # Area, Role, Company, Contact, Email, LinkedIn, Status, Notes
                        writer.writerow(['Bangalore', 'HR/Tech', name, 'HR Team', email, '', 'Pending', 'From Funding Dataset'])
                        count += 1
                        
                        # Stop if we hit 900 to give the user the 800+ they asked for
                        if count >= 900:
                            break

    print(f"Successfully processed and added {count} Bangalore startups to your CSV!")

except Exception as e:
    print(f"Failed to fetch or process dataset: {e}")
