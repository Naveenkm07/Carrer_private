import os
import smtplib
from email.message import EmailMessage

# Manually parse the .env file since python-dotenv might not be installed
env_vars = {}
try:
    with open(r'x:\job\Carrer_private\.env', 'r') as f:
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

msg = EmailMessage()
msg['Subject'] = 'Test Automated Email: AI/ML Engineer Resume'
msg['From'] = GMAIL_USER
msg['To'] = GMAIL_USER  # Send to self for testing

msg.set_content("""Hi Naveen,

This is a test email sent from your AI assistant to verify that your automated mailer campaign and credentials are fully working!

I have attached your resume from the resume_mine folder just as you requested. We can use this exact same mechanism to automatically blast out emails to the 387 startups we just collected.

Best,
Your AI Assistant""")

# Attach the resume
resume_path = r'x:\job\Carrer_private\resume_mine\mobile_app.pdf'
try:
    with open(resume_path, 'rb') as f:
        pdf_data = f.read()
    msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename='Naveen_Kumar_Mobile_App_Resume.pdf')
except Exception as e:
    print(f"Could not read resume: {e}")
    exit(1)

try:
    print("Connecting to Gmail SMTP server...")
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        smtp.send_message(msg)
    print("[SUCCESS] TEST EMAIL SENT SUCCESSFULLY to " + GMAIL_USER)
except Exception as e:
    print(f"[FAILED] to send email: {e}")
