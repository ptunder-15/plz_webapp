import os
from fastapi import Header, HTTPException

def get_current_user(cf_access_authenticated_user_email: str = Header(default=None)):
    """
    Liest die E-Mail des eingeloggten Nutzers aus dem Cloudflare-Header aus.
    """
    # 1. Prüfen, ob der Header von Cloudflare da ist (Live-Umgebung)
    if cf_access_authenticated_user_email:
        return cf_access_authenticated_user_email
    
    # 2. Wenn kein Header da ist, prüfen wir, ob wir lokal entwickeln
    if os.getenv("ENVIRONMENT") == "local":
        return "kollege@entwickler.de" # Dein Test-Account für die lokale Entwicklung
    
    # 3. Wenn wir live sind, aber kein Header da ist -> Zugriff verweigern
    raise HTTPException(status_code=401, detail="Nicht authentifiziert")