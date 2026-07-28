import os
import csv
import smtplib
import time
import shutil
from email.message import EmailMessage
from tempfile import NamedTemporaryFile

# ==========================================
# CONFIGURATION
# ==========================================
DRY_RUN = False  # Set to False when you are ready to actually send emails!
MAX_EMAILS_PER_DAY = 50
DELAY_SECONDS = 60  # Wait 60 seconds between emails to avoid spam filters

SUBJECT = "Application for Mobile App Developer / Software Engineering Roles - Naveen Kumar K M"
BODY = """Hi Hiring Team,

I am writing to express my interest in Mobile App Developer or Software Engineering opportunities at your company. 

I am a software developer with hands-on experience building mobile applications. I have attached my resume for your review, which details my projects, technical skills, and background. 

I would love to learn more about any open opportunities at your company and how my skills could contribute to your team. 

Thank you for your time and consideration.

Best regards,
Naveen Kumar K M"""

RESUME_PATH = r'x:\job\Carrer_private\resume_mine\mobile_app.pdf'
CSV_PATH = r'x:\job\Carrer_private\Startup_Cold_Mails\Bengaluru_Startup_Leads_Format.csv'
ENV_PATH = r'x:\job\Carrer_private\.env'

# ==========================================
# CREDENTIALS
# ==========================================
env_vars = {}
try:
    with open(ENV_PATH, 'r') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                env_vars[key] = val
except Exception as e:
    print(f"Could not read .env: {e}")
    exit(1)

GMAIL_USER = env_vars.get('GMAIL_USER')
GMAIL_APP_PASSWORD = env_vars.get('GMAIL_APP_PASSWORD')

if not GMAIL_USER or not GMAIL_APP_PASSWORD:
    print("Credentials not found in .env")
    exit(1)

# Read PDF data once
try:
    with open(RESUME_PATH, 'rb') as f:
        pdf_data = f.read()
except Exception as e:
    print(f"Could not read resume: {e}")
    exit(1)

# ==========================================
# MAIN EXECUTION
# ==========================================
def send_email(smtp_server, to_email, company_name):
    msg = EmailMessage()
    msg['Subject'] = SUBJECT
    msg['From'] = GMAIL_USER
    msg['To'] = to_email
    msg.set_content(BODY)
    msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename='Naveen_Kumar_Mobile_App_Resume.pdf')
    
    if DRY_RUN:
        print(f"[DRY RUN] Would send email to: {to_email} ({company_name})")
        return True
    else:
        try:
            smtp_server.send_message(msg)
            print(f"[SUCCESS] Email sent to: {to_email} ({company_name})")
            return True
        except Exception as e:
            print(f"[FAILED] Failed to send to {to_email}: {e}")
            return False

def main():
    print("[START] Starting Automated Mailer Campaign")
    if DRY_RUN:
        print("[WARNING] RUNNING IN DRY RUN MODE (No emails will actually be sent)\n")
    
    sent_count = 0
    tempfile = NamedTemporaryFile(mode='w', delete=False, newline='', encoding='utf-8')
    
    try:
        # We need an SMTP connection open for the session if we are actually sending
        smtp = None
        if not DRY_RUN:
            print("Connecting to Gmail SMTP server...")
            smtp = smtplib.SMTP_SSL('smtp.gmail.com', 465)
            smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            
        with open(CSV_PATH, 'r', newline='', encoding='utf-8') as csvfile, tempfile:
            reader = csv.reader(csvfile)
            writer = csv.writer(tempfile)
            
            headers = next(reader, None)
            if headers:
                writer.writerow(headers)
                
            for row in reader:
                # Row structure: Area, Role, Company Name, Contact Person, Email Address, LinkedIn Profile, Status, Notes
                if len(row) < 7:
                    writer.writerow(row)
                    continue
                    
                company = row[2]
                email = row[4]
                status = row[6]
                
                if status == 'Pending' and '@' in email and sent_count < MAX_EMAILS_PER_DAY:
                    success = send_email(smtp, email, company)
                    if success:
                        row[6] = 'Sent'
                        sent_count += 1
                        
                        if not DRY_RUN and sent_count < MAX_EMAILS_PER_DAY:
                            print(f"Waiting {DELAY_SECONDS} seconds to avoid spam filters...")
                            time.sleep(DELAY_SECONDS)
                
                writer.writerow(row)
                
        if smtp:
            smtp.quit()
            
        # Replace original CSV with updated temp file safely
        if not DRY_RUN:
            shutil.move(tempfile.name, CSV_PATH)
            print(f"\n[DONE] Campaign complete for today! Sent {sent_count} emails and updated CSV.")
        else:
            os.remove(tempfile.name)
            print(f"\n[DONE] Dry run complete. {sent_count} emails would have been sent.")
            
    except Exception as e:
        print(f"An error occurred during campaign execution: {e}")

if __name__ == "__main__":
    main()
