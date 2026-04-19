import json
import base64
from fastapi import Request, HTTPException

def get_current_user(request: Request):
    # 1. Lokale Entwicklung durchwinken
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return "admin@standard-grid.com"

    # 2. Den alten Header prüfen (falls Cloudflare ihn doch mal schickt)
    email = request.headers.get("cf-access-authenticated-user-email")
    if email:
        return email

    # 3. Das verschlüsselte JWT-Token von Cloudflare knacken (Das ist unser Fix!)
    jwt_token = request.headers.get("cf-access-jwt-assertion")
    if jwt_token:
        try:
            # Ein JWT besteht aus 3 Teilen (Header.Payload.Signature). Wir brauchen den mittleren Teil (Payload).
            payload_b64 = jwt_token.split('.')[1]
            
            # Base64-Padding reparieren (wichtig für Python)
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            
            # Entschlüsseln und in ein Dictionary umwandeln
            payload_json = base64.b64decode(payload_b64).decode('utf-8')
            payload = json.loads(payload_json)
            
            # E-Mail aus dem Token zurückgeben!
            if "email" in payload:
                return payload["email"]
        except Exception:
            pass # Falls das Token kaputt ist, fallen wir unten in den 401-Fehler

    # 4. Wenn wirklich gar nichts da ist -> Rauswerfen
    raise HTTPException(
        status_code=401, 
        detail="Zugriff verweigert. Kein gültiges Cloudflare-Token gefunden."
    )