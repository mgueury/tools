from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Email(BaseModel):
    title: str
    sender: str
    date: str
    content: str

fixed_emails = [
    {
        "title": "Meeting Reminder: Project X",
        "sender": "team@example.com",
        "date": "2023-10-27 10:00:00",
        "content": "Don't forget our meeting at 10 AM to discuss Project X."
    },
    {
        "title": "Weekly Report",
        "sender": "reports@example.org",
        "date": "2023-10-26 16:30:00",
        "content": "Please find attached the weekly report."
    },
    {
        "title": "Holiday Announcement",
        "sender": "hr@example.net",
        "date": "2023-10-25 09:15:00",
        "content": "Company holiday on December 25th."
    },
    {
        "title": "Invoice #1234",
        "sender": "billing@example.com",
        "date": "2023-10-24 14:00:00",
        "content": "Your invoice #1234 is now available."
    },
    {
        "title": "Welcome to Our Newsletter!",
        "sender": "newsletter@example.org",
        "date": "2023-10-23 11:45:00",
        "content": "Thank you for subscribing to our newsletter."
    },
]

@app.get("/email/", response_model=list[Email])
async def list_email(number: int = 1):
    number = min(number, len(fixed_emails))
    emails = []
    for i in range(number):
        email_dict = fixed_emails[i]
        email = Email(title=email_dict["title"], sender=email_dict["sender"], date=email_dict["date"], content=email_dict["content"])
        emails.append(email)
    return emails

@app.get("/email/{email_id}", response_model=Email)
async def get_email(email_id: int):
    """
    Returns a specific email by ID (1-5).
    """
    if 1 <= email_id <= len(fixed_emails):
        email_dict = fixed_emails[email_id - 1]  # Adjust ID to list index
        return Email(title=email_dict["title"], sender=email_dict["sender"], date=email_dict["date"], content=email_dict["content"])
    else:
        raise HTTPException(status_code=404, detail="Email not found")

# Example usage (run with uvicorn):
# uvicorn main:app --reload
# Then go to:
# http://127.0.0.1:8000/fixed_emails/3 (to get email with ID 3)
# http://127.0.0.1:8000/fixed_emails/ (to get a list of emails)
