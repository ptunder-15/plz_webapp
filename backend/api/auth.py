from fastapi import Request, HTTPException

def get_current_user(request: Request):
    # Cloudflare Access schickt die E-Mail des Nutzers in diesem Header
    user_email = request.headers.get("Cf-Access-Authenticated-User-Email")
    
    # Lokale Entwicklung erlauben (localhost)
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return "admin@standard-grid.com"

    # In der Produktion MUSS dieser Header existieren
    if not user_email:
        raise HTTPException(
            status_code=401, 
            detail="Kein Cloudflare-Sitzungs-Header gefunden. Bitte einloggen."
        )
    
    return user_email