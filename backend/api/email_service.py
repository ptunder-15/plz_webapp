"""
E-Mail-Versand über SMTP.

Konfiguration via Umgebungsvariablen:
  SMTP_HOST     z.B. smtp.gmail.com oder smtp.resend.com
  SMTP_PORT     z.B. 587 (STARTTLS) oder 465 (SSL)
  SMTP_USER     z.B. deine@email.de oder "resend"
  SMTP_PASSWORD App-Passwort / API-Key
  SMTP_FROM     Absender-Adresse z.B. "standardgrid <noreply@standard-grid.com>"
  APP_URL       z.B. https://app.standard-grid.com

Falls SMTP_HOST nicht gesetzt ist, wird die URL nur ins Log geschrieben (Entwicklung).
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "standardgrid <noreply@standard-grid.com>")


def _send_email(to: str, subject: str, html: str) -> None:
    if not SMTP_HOST:
        print(f"\n[E-MAIL DEV] An: {to}\nBetreff: {subject}\n{html}\n")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, to, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, to, msg.as_string())
    except Exception as e:
        print(f"[E-MAIL FEHLER] {e}")


def send_invite_email(to_email: str, invite_url: str, invited_by: str, team_name: str) -> None:
    subject = f"Du wurdest zu {team_name} auf standardgrid eingeladen"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
      <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.04em; color: #1d1d1f; margin-bottom: 8px;">
        standardgrid
      </h1>
      <p style="font-size: 16px; color: #374151; margin-bottom: 32px;">
        <strong>{invited_by}</strong> hat dich zum Team <strong>{team_name}</strong> eingeladen.
      </p>
      <a href="{invite_url}"
         style="display: inline-block; background: #1d1d1f; color: #fff; text-decoration: none;
                padding: 14px 28px; border-radius: 14px; font-size: 15px; font-weight: 600;">
        Einladung annehmen
      </a>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 32px;">
        Dieser Link ist 7 Tage gültig.<br>
        Falls du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.
      </p>
    </div>
    """
    _send_email(to_email, subject, html)
    print(f"[INVITE] {invite_url}")


def send_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Passwort zurücksetzen – standardgrid"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
      <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.04em; color: #1d1d1f; margin-bottom: 8px;">
        standardgrid
      </h1>
      <p style="font-size: 16px; color: #374151; margin-bottom: 32px;">
        Du hast ein Passwort-Reset angefordert. Klicke auf den Button um ein neues Passwort zu setzen.
      </p>
      <a href="{reset_url}"
         style="display: inline-block; background: #1d1d1f; color: #fff; text-decoration: none;
                padding: 14px 28px; border-radius: 14px; font-size: 15px; font-weight: 600;">
        Passwort zurücksetzen
      </a>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 32px;">
        Dieser Link ist 2 Stunden gültig.<br>
        Falls du kein Reset angefordert hast, ignoriere diese E-Mail.
      </p>
    </div>
    """
    _send_email(to_email, subject, html)
    print(f"[RESET] {reset_url}")
