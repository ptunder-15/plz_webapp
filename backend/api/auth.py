from fastapi import Request, HTTPException

def get_current_user(request: Request):
    user_email = request.headers.get("Cf-Access-Authenticated-User-Email")
    
    # Lokaler Check
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        return "admin@standard-grid.com"

    if not user_email:
        raise HTTPException(
            status_code=401, 
            detail="Nicht authentifiziert. Bitte über Cloudflare anmelden."
        )
    
    return user_email