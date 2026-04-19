from fastapi import Request, HTTPException
import logging

# Logger einrichten, damit wir es in den Render-Logs sehen
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_current_user(request: Request):
    # Wir loggen ALLE Header, die bei Render ankommen!
    logger.info("=== NEUER REQUEST ===")
    logger.info(f"Alle eingehenden Header: {request.headers}")
    
    user_email = request.headers.get("Cf-Access-Authenticated-User-Email")
    
    # Lokaler Check (unverändert)
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return "admin@standard-grid.com"

    # Wenn die E-Mail fehlt, geben wir im Fehler exakt aus, WELCHE Header wir bekommen haben.
    if not user_email:
        # Wir machen die Header zu einem String, damit wir sie in der Fehlermeldung lesen können
        header_str = str(dict(request.headers))
        raise HTTPException(
            status_code=401, 
            detail=f"Nicht authentifiziert. Diese Header kamen an: {header_str}"
        )
    
    return user_email