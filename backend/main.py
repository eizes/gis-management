from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import os
import django
import httpx
import secrets
from dotenv import load_dotenv
from asgiref.sync import sync_to_async

# Django Setup
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from settings_app.models import Settings

app = FastAPI(title="GIS Management API v2.0")

# Session Storage (TODO: Redis für Production!)
sessions = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gis.eizes.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# KeyCloak Config aus DB laden - MIT sync_to_async!
@sync_to_async
def get_keycloak_config_sync():
    try:
        kc = Settings.objects.get(service_name='keycloak', is_active=True)
        return {
            'url': kc.website_url,
            'realm': kc.keycloak_realm,
            'client_id': kc.keycloak_client_id,
            'client_secret': kc.keycloak_client_secret
        }
    except Settings.DoesNotExist:
        raise HTTPException(status_code=500, detail="KeyCloak config not found in database")

async def get_keycloak_config():
    return await get_keycloak_config_sync()

# Session-basierte Auth
async def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = sessions[session_id]
    if session['expires'] < datetime.now():
        del sessions[session_id]
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session['user']

class ServiceUpdate(BaseModel):
    website: Optional[Dict[str, str]] = None
    database: Optional[Dict[str, Any]] = None
    credentials: Optional[Dict[str, str]] = None

@app.get("/")
async def root():
    return {"service": "GIS Management API", "version": "2.0.0", "auth": "session-based"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# AUTH ENDPOINTS
@app.get("/api/auth/login")
async def login():
    """Redirect zu KeyCloak Login"""
    config = await get_keycloak_config()
    
    state = secrets.token_urlsafe(32)
    sessions[f"state_{state}"] = {"created": datetime.now()}
    
    auth_url = (
        f"{config['url']}/realms/{config['realm']}/protocol/openid-connect/auth"
        f"?client_id={config['client_id']}"
        f"&redirect_uri=https://gis.eizes.com/api/auth/callback"
        f"&response_type=code"
        f"&scope=openid profile email"
        f"&state={state}"
    )
    
    return RedirectResponse(auth_url)

@app.get("/api/auth/callback")
async def callback(code: str, state: str, response: Response):
    """KeyCloak Callback - tauscht Code gegen Token"""
    
    # State validieren
    if f"state_{state}" not in sessions:
        raise HTTPException(status_code=400, detail="Invalid state")
    del sessions[f"state_{state}"]
    
    config = await get_keycloak_config()
    
    # Token mit Client Secret holen
    token_url = f"{config['url']}/realms/{config['realm']}/protocol/openid-connect/token"
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            token_url,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': 'https://gis.eizes.com/api/auth/callback',
                'client_id': config['client_id'],
                'client_secret': config['client_secret']
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
    
    if token_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Token exchange failed")
    
    token_data = token_response.json()
    access_token = token_data['access_token']
    
    # User Info holen
    userinfo_url = f"{config['url']}/realms/{config['realm']}/protocol/openid-connect/userinfo"
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            userinfo_url,
            headers={'Authorization': f'Bearer {access_token}'}
        )
    
    if user_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get user info")
    
    user_info = user_response.json()
    
    # Session erstellen
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        'user': {
            'username': user_info.get('preferred_username'),
            'email': user_info.get('email'),
            'name': user_info.get('name')
        },
        'access_token': access_token,
        'refresh_token': token_data.get('refresh_token'),
        'expires': datetime.now() + timedelta(hours=8)
    }
    
    # Cookie setzen
    response = RedirectResponse(url='https://gis.eizes.com')
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=28800  # 8 Stunden
    )
    
    return response

@app.get("/api/auth/logout")
async def logout(request: Request, response: Response):
    """Logout - Session löschen"""
    session_id = request.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
    
    response.delete_cookie("session_id")
    return {"message": "Logged out"}

@app.get("/api/user/profile")
async def profile(user: dict = Depends(get_current_user)):
    return user

# SETTINGS ENDPOINTS - MIT sync_to_async!
@sync_to_async
def get_settings_sync():
    settings = Settings.objects.filter(is_active=True).exclude(service_name='keycloak')
    result = {}
    for setting in settings:
        result[setting.service_name] = setting.to_dict()
    return result

@app.get("/api/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    try:
        return await get_settings_sync()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@sync_to_async
def get_service_sync(service: str):
    return Settings.objects.get(service_name=service, is_active=True).to_dict()

@app.get("/api/settings/{service}")
async def get_service(service: str, user: dict = Depends(get_current_user)):
    try:
        return await get_service_sync(service)
    except Settings.DoesNotExist:
        raise HTTPException(status_code=404, detail="Service not found")

@sync_to_async
def update_service_sync(service: str, data: ServiceUpdate, username: str):
    setting = Settings.objects.get(service_name=service, is_active=True)
    
    if data.website and 'url' in data.website:
        setting.website_url = data.website['url']
    
    if data.database:
        setting.db_host = data.database.get('host')
        setting.db_port = data.database.get('port')
        setting.db_name = data.database.get('database')
        setting.db_user = data.database.get('user')
        if 'password' in data.database:
            setting.db_password = data.database['password']
    
    if data.credentials:
        setting.service_user = data.credentials.get('user')
        if 'password' in data.credentials:
            setting.service_password = data.credentials['password']
    
    setting.updated_by = username
    setting.save()
    
    return setting.to_dict()

@app.put("/api/settings/{service}")
async def update_service(service: str, data: ServiceUpdate, user: dict = Depends(get_current_user)):
    try:
        result = await update_service_sync(service, data, user.get('username'))
        return {"message": "Updated successfully", "data": result}
    except Settings.DoesNotExist:
        raise HTTPException(status_code=404, detail="Service not found")
