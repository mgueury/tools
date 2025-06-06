import secrets
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from datetime import datetime
from typing import Annotated
from langchain_tavily import TavilySearch
import logging

app = FastAPI()
logging.basicConfig( format='%(asctime)s %(levelname)-8s %(message)s', level=logging.INFO, datefmt='%Y-%m-%d %H:%M:%S')

#----------------------------------------------------------------------------

security = HTTPBasic()

def get_current_username(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
):
    current_username_bytes = credentials.username.encode("utf8")
    correct_username_bytes = b"test"
    is_correct_username = secrets.compare_digest(
        current_username_bytes, correct_username_bytes
    )
    current_password_bytes = credentials.password.encode("utf8")
    correct_password_bytes = b"test"
    is_correct_password = secrets.compare_digest(
        current_password_bytes, correct_password_bytes
    )
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/users/me")
def read_current_user(username: Annotated[str, Depends(get_current_username)]):
    return {"username": username}

# app = FastAPI(dependencies=[Depends(get_current_username())])

#----------------------------------------------------------------------------

class Email(BaseModel):
    id: int
    title: str
    sender: str
    date: str
    content: str

now = datetime.now() 
today = now.strftime("10-%m-%Y")

fixed_emails = [
    {
        "id": "1",
        "title": "Meeting Reminder: Project X",
        "sender": "meeting@example.com",
        "date": today + " 09:34:00",
        "content": "Don't forget our meeting at 14AM " + today + " to discuss Project X. We meet in our Dubai office."
    },
    {
        "id": "2",
        "title": "Weekly Report",
        "sender": "reports@example.com",
        "date": today + " 10:30:00",
        "content": "Please find attached the weekly report."
    },
    {
        "id": "3",
        "title": "Holiday request",
        "sender": "joe.doe@example.com",
        "date": today + " 10:45:00",
        "content": "I would like to take 5 days of holiday next week ? Is it possible ?"
    },
    {
        "id": "4",
        "title": "Invoice #1234",
        "sender": "billing@example.com",
        "date": today + " 10:52:00",
        "content": "Your invoice #1234 is now available."
    },
    {
        "id": "5",
        "title": "Welcome to Our Newsletter!",
        "sender": "newsletter@example.com",
        "date": today + " 11:15:00",
        "content": "Thank you for subscribing to our newsletter."
    },
]
#----------------------------------------------------------------------------

@app.get("/email", response_model=list[Email])
async def list_email(number: int = 1):
    number = min(number, len(fixed_emails))
    emails = []
    for i in range(number):
        email_dict = fixed_emails[i]
        email = Email(id=email_dict["id"],title=email_dict["title"], sender=email_dict["sender"], date=email_dict["date"], content=email_dict["content"])
        emails.append(email)
    return emails

#----------------------------------------------------------------------------

@app.get("/email/{id}", response_model=Email)
async def get_email(id: int):
    """
    Returns a specific email by ID (1-5).
    """
    if 1 <= id <= len(fixed_emails):
        email_dict = fixed_emails[id - 1]  # Adjust ID to list index
        return Email(id=email_dict["id"],title=email_dict["title"], sender=email_dict["sender"], date=email_dict["date"], content=email_dict["content"])
    else:
        raise HTTPException(status_code=404, detail="Email not found")

#----------------------------------------------------------------------------

@app.get("/hr_policy")
async def hr_policy(email: str):
    logging.info(f"<hr_policy>email={email}")
    email_policy_table = {
        "joe.doe@example.com": "Employee of Belgium. Allowed to take 25 days of holidays. Has already taken 10 days.",
        "jane.smith@example.com": "Employee of Netherlands. Allowed to take 26 days of holidays. Has already taken 11 days.",
        "nestor.dupont@example.com": "Employee of Dubai. Allowed to take 19 days of holidays. Has already taken 18 days.",
        "aldo.macho@example.com": "Employee of Italy. Allowed to take 30 days of holidays. Has already taken 2 days."
    }
    policy = email_policy_table.get(email) 
    if policy:
        return str(policy)
    else:
        return(f"No policy found for {email}")

#----------------------------------------------------------------------------

@app.get("/calc")
def calc(operation: str):
    """
    Calculates the result of a mathematical expression given as a string.

    Args:
        operation: A string representing a mathematical expression.

    Returns:
        The result of the expression.
    """
    try:
        for char in operation:
            if char.isalpha():
                return 'Non numerical input'
        result = eval(operation)
        return result  # Ensure the result is a float
    except (SyntaxError, TypeError, NameError, ZeroDivisionError) as e:
        return (f"Error evaluating expression: {e}")

#----------------------------------------------------------------------------

@app.get('/dept')
def dept():
    a = [ 
        { "deptno": "10", "dname": "ACCOUNTING", "loc": "Seoul"},
        { "deptno": "20", "dname": "RESEARCH", "loc": "Cape Town"},
        { "deptno": "30", "dname": "SALES", "loc": "Brussels"},
        { "deptno": "40", "dname": "OPERATIONS", "loc": "San Francisco"}
    ]  
    return a  

#----------------------------------------------------------------------------

@app.get('/tavilySearch')
def tavilySearch(question: str):
    ## need to set ("TAVILY_API_KEY")
    tool = TavilySearch(max_results=3)
    search_docs = tool.invoke(question)
    return search_docs

@app.get('/info')
def info():
    return "Python - FastAPI - No Database" 

# curl http://localhost:8080/hr_policy?email=joe.doe@example.com
# curl http://localhost:8080/calc?operation=5*5
# curl http://localhost:8080/email/3
#
