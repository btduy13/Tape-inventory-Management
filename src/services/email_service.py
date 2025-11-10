import smtplib
from email.message import EmailMessage
from typing import List, Tuple
from src.utils.config import EMAIL_CONFIG


def send_email(to_address: str, subject: str, body: str, attachments: List[Tuple[str, bytes, str]] = None, html_body: str = None):
    """
    Gửi email qua SMTP theo cấu hình trong EMAIL_CONFIG.

    attachments: list of tuples (file_name, data_bytes, content_type)
    html_body: Optional HTML version of the email body
    """
    if attachments is None:
        attachments = []

    msg = EmailMessage()
    msg["From"] = EMAIL_CONFIG.get("sender") or EMAIL_CONFIG.get("username")
    msg["To"] = to_address
    msg["Subject"] = subject
    
    # Set both plain text and HTML if provided
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    for file_name, data, content_type in attachments:
        maintype, _, subtype = (content_type or "application/octet-stream").partition("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=file_name)

    server = EMAIL_CONFIG.get("server")
    port = EMAIL_CONFIG.get("port")
    username = EMAIL_CONFIG.get("username")
    password = EMAIL_CONFIG.get("password")

    if not (server and port and username and password):
        raise ValueError("Thiếu cấu hình email. Vui lòng cập nhật EMAIL_CONFIG trong config.py")

    with smtplib.SMTP(server, port) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)


