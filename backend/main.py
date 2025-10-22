from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
import secrets
import os
import django
from datetime import datetime, timedelta
from asgiref.sync import sync_to_async
import psycopg2

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from settings_app.models import Settings

app = FastAPI()

KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', 'https://auth.eizes.com')
KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM', 'eizes')
KEYCLOAK_CLIENT_ID = os.getenv('KEYCLOAK_CLIENT_ID', 'eizes-gis')
REQUIRED_GROUP = os.getenv('REQUIRED_GROUP')
if not REQUIRED_GROUP:
    raise ValueError("CRITICAL: REQUIRED_GROUP environment variable must be set in .env file!")
KEYCLOAK_CLIENT_SECRET = os.getenv('KEYCLOAK_CLIENT_SECRET', '')
REDIRECT_URI = 'https://gis.eizes.com/api/auth/callback'

sessions: Dict[str, Dict[str, Any]] = {}

class ServiceUpdate(BaseModel):
    website: Optional[Dict] = None
    database: Optional[Dict] = None
    credentials: Optional[Dict] = None  # Für Geoserver, uMap (user/password)
    auth: Optional[Dict] = None  # Für Traccar (token)

# NEUE Pydantic Models für Workspace-Validierung
class WorkspaceValidationRequest(BaseModel):
    workspace: str
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

class WorkspaceValidationResponse(BaseModel):
    exists: bool
    message: str
    workspace: str

async def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session_data = sessions[session_id]
    if session_data['expires'] < datetime.now():
        del sessions[session_id]
        raise HTTPException(status_code=401, detail="Session expired")
    return session_data['user']

async def get_umap_config():
    try:
        setting = await sync_to_async(Settings.objects.get)(service_name='umap', is_active=True)
        return {
            'url': setting.website_url,
            'db_host': setting.db_host,
            'db_port': setting.db_port,
            'db_name': setting.db_name,
            'db_user': setting.db_user,
            'db_password': setting.db_password
        }
    except Settings.DoesNotExist:
        raise HTTPException(status_code=500, detail="uMap settings not configured")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/auth/login")
async def login():
    state = secrets.token_urlsafe(32)
    auth_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/auth"
    params = {
        'client_id': KEYCLOAK_CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid profile email',
        'state': state
    }
    url = f"{auth_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return RedirectResponse(url=url)

@app.get("/api/auth/callback")
async def callback(code: str, state: str):
    token_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"
    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data={
            'grant_type': 'authorization_code',
            'client_id': KEYCLOAK_CLIENT_ID,
            'client_secret': KEYCLOAK_CLIENT_SECRET,
            'code': code,
            'redirect_uri': REDIRECT_URI
        })
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get token")
    token_data = token_response.json()
    access_token = token_data['access_token']
    userinfo_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo"
    async with httpx.AsyncClient() as client:
        userinfo_response = await client.get(userinfo_url, headers={'Authorization': f'Bearer {access_token}'})
    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    user_info = userinfo_response.json()
    user_groups = user_info.get('groups', [])
    if REQUIRED_GROUP not in user_groups:
        error_html = f"""<!DOCTYPE html><html lang="de"><head><title>Zugriff verweigert</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px}}.container{{background:white;padding:3rem;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;max-width:600px;width:100%}}.icon{{font-size:4rem;margin-bottom:1rem}}h1{{color:#dc2626;margin-bottom:1rem;font-size:1.8rem}}p{{color:#4b5563;margin:1rem 0;line-height:1.6}}.group{{background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);padding:1.25rem;border-radius:12px;font-weight:bold;color:#78350f;margin:1.5rem 0;font-size:1.1rem;border:2px solid #fbbf24;box-shadow:0 4px 12px rgba(251,191,36,0.2)}}.group-name{{display:inline-block;background:rgba(255,255,255,0.6);padding:0.5rem 1rem;border-radius:8px;font-family:'Courier New',monospace;font-size:1.15rem;color:#92400e;margin-top:0.5rem;border:1px solid #f59e0b}}.user-info{{background:#f3f4f6;padding:1.25rem;border-radius:12px;margin:1.5rem 0;font-size:0.95rem;color:#374151;border:1px solid #e5e7eb}}.user-info strong{{display:block;margin-bottom:0.5rem;color:#1f2937}}.info-box{{background:#eff6ff;padding:1rem;border-radius:10px;margin:1.5rem 0;font-size:0.9rem;color:#1e40af;border-left:4px solid #3b82f6;text-align:left}}.btn{{display:inline-block;margin-top:1.5rem;padding:0.875rem 2.5rem;background:#3b82f6;color:white;text-decoration:none;border-radius:12px;font-weight:600;transition:all 0.3s;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.3)}}.btn:hover{{background:#2563eb;transform:translateY(-2px);box-shadow:0 6px 16px rgba(59,130,246,0.4)}}</style></head><body><div class="container"><div class="icon">🔒</div><h1>Zugriff verweigert</h1><p>Sie haben keine Berechtigung für die GIS Management Anwendung.</p><div class="group">Erforderliche Gruppe:<div class="group-name">{REQUIRED_GROUP}</div></div><div class="user-info"><strong>Angemeldet als:</strong>{user_info.get('preferred_username','Unbekannt')}<br>{user_info.get('email','')}</div><div class="info-box"><strong>💡 Was können Sie tun?</strong><br>Kontaktieren Sie Ihren Administrator, um der Gruppe <strong>{REQUIRED_GROUP}</strong> im KeyCloak-System hinzugefügt zu werden.</div><a href="https://gis.eizes.com/api/auth/login" class="btn">Erneut anmelden</a></div></body></html>"""
        return HTMLResponse(content=error_html, status_code=403)
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        'user': {'username': user_info.get('preferred_username'), 'email': user_info.get('email'), 'name': user_info.get('name'), 'groups': user_groups},
        'groups': user_groups,
        'access_token': access_token,
        'refresh_token': token_data.get('refresh_token'),
        'expires': datetime.now() + timedelta(hours=8)
    }
    response = RedirectResponse(url='https://gis.eizes.com')
    response.set_cookie(key="session_id", value=session_id, httponly=True, secure=True, samesite="lax", max_age=28800)
    return response

@app.get("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
    response.delete_cookie("session_id")
    return {"message": "Logged out"}

@app.get("/api/user/profile")
async def profile(user: dict = Depends(get_current_user)):
    return user

@app.get("/api/umap/maps")
async def get_umap_maps(user: dict = Depends(get_current_user)):
    try:
        config = await get_umap_config()
        username = user.get('username')
        conn = psycopg2.connect(
            host=config['db_host'],
            port=config['db_port'],
            database=config['db_name'],
            user=config['db_user'],
            password=config['db_password']
        )
        cursor = conn.cursor()

        # VEREINFACHTE Query - nur umap_map und auth_user
        query = """
        SELECT 
            m.id,
            m.name,
            m.slug,
            m.share_status,
            m.created_at,
            m.modified_at
        FROM umap_map m
        INNER JOIN auth_user u ON m.owner_id = u.id
        WHERE u.username = %s
        ORDER BY m.modified_at DESC
        """

        cursor.execute(query, (username,))
        rows = cursor.fetchall()

        share_status_map = {1: 'Öffentlich', 2: 'Mit Link', 3: 'Privat'}
        maps = []

        for row in rows:
            map_id = row[0]

            # Feature-Count separat ermitteln (robuster)
            feature_count = 0
            try:
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM umap_datalayer 
                    WHERE map_id = %s
                """, (map_id,))
                result = cursor.fetchone()
                if result:
                    feature_count = result[0]
            except:
                # Wenn Tabelle nicht existiert oder anders heißt, ignorieren
                pass

            maps.append({
                'id': map_id,
                'name': row[1],
                'slug': row[2],
                'description': '',
                'share_status': share_status_map.get(row[3], 'Unbekannt'),
                'created_at': row[4].isoformat() if row[4] else None,
                'modified_at': row[5].isoformat() if row[5] else None,
                'feature_count': feature_count,
                'edit_url': f"{config['url']}/de/map/{row[2]}_{map_id}",
                'view_url': f"{config['url']}/de/map/{row[2]}_{map_id}"
            })

        cursor.close()
        conn.close()

        return {"maps": maps, "count": len(maps)}

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Datenbankfehler: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Laden der Karten: {str(e)}")

@app.post("/api/umap/maps/{map_id}/save-to-geoserver")
async def save_to_geoserver(map_id: int, user: dict = Depends(get_current_user)):
    return {"message": "Funktion wird implementiert", "map_id": map_id, "status": "pending"}

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
    
    # Website URL
    if data.website and 'url' in data.website:
        setting.website_url = data.website['url']
    
    # Database settings
    if data.database:
        setting.db_host = data.database.get('host')
        setting.db_port = data.database.get('port')
        setting.db_name = data.database.get('database')
        setting.db_user = data.database.get('user')
        if 'password' in data.database:
            setting.db_password = data.database['password']
        
        # Geoserver Workspace
        if service == 'geoserver' and 'workspace' in data.database:
            setting.geoserver_workspace = data.database['workspace']
    
    # WICHTIG: Unterscheide zwischen Traccar (Token) und anderen Services (User/Password)
    if service == 'traccar':
        # Traccar verwendet Token-Authentifizierung
        if data.auth and 'token' in data.auth:
            setting.traccar_token = data.auth['token']
    else:
        # Andere Services (Geoserver, uMap) verwenden User/Password
        if data.credentials:
            setting.service_user = data.credentials.get('user')
            if 'password' in data.credentials:
                setting.service_password = data.credentials['password']
    
    setting.updated_by = username
    
    # Validierung für Geoserver Workspace (nutzt die Model-Methode)
    if service == 'geoserver' and setting.geoserver_workspace:
        exists, error_message = setting.check_geoserver_workspace_exists()
        if not exists:
            raise ValueError(f"workspace:{error_message}")
    
    setting.save()
    return setting.to_dict()

@app.put("/api/settings/{service}")
async def update_service(service: str, data: ServiceUpdate, user: dict = Depends(get_current_user)):
    try:
        result = await update_service_sync(service, data, user.get('username'))
        return {"message": "Updated successfully", "data": result}
    except Settings.DoesNotExist:
        raise HTTPException(status_code=404, detail="Service not found")
    except ValueError as e:
        error_str = str(e)
        if error_str.startswith("workspace:"):
            raise HTTPException(
                status_code=400, 
                detail={
                    "field": "workspace",
                    "message": error_str.replace("workspace:", "")
                }
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NEUE FUNKTION: Workspace-Validierung ohne zu speichern
@app.post("/api/settings/geoserver/validate-workspace", response_model=WorkspaceValidationResponse)
async def validate_geoserver_workspace(
    data: WorkspaceValidationRequest, 
    user: dict = Depends(get_current_user)
):
    """
    Validiert ob ein Workspace (Schema) in der Geoserver PostGIS-Datenbank existiert.
    Wird vom Frontend für Live-Validierung genutzt.
    """
    connection = None
    cursor = None
    
    try:
        # Verbinde zur Geoserver PostGIS-Datenbank
        connection = psycopg2.connect(
            host=data.db_host,
            port=data.db_port,
            database=data.db_name,
            user=data.db_user,
            password=data.db_password,
            connect_timeout=5
        )
        
        cursor = connection.cursor()
        
        # Prüfe ob Schema existiert
        cursor.execute("""
            SELECT EXISTS(
                SELECT 1 
                FROM information_schema.schemata 
                WHERE schema_name = %s
            );
        """, (data.workspace,))
        
        exists = cursor.fetchone()[0]
        
        if not exists:
            # Liste verfügbare Schemas
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                ORDER BY schema_name
                LIMIT 10;
            """)
            available_schemas = [row[0] for row in cursor.fetchall()]
            
            message = (
                f"Das Schema '{data.workspace}' existiert nicht in der Geoserver PostGIS-Datenbank "
                f"'{data.db_name}' auf Host '{data.db_host}'. "
            )
            
            if available_schemas:
                message += f"Verfügbare Schemas: {', '.join(available_schemas)}"
            
            return WorkspaceValidationResponse(
                exists=False,
                message=message,
                workspace=data.workspace
            )
        
        return WorkspaceValidationResponse(
            exists=True,
            message=f"Schema '{data.workspace}' existiert in der Geoserver-Datenbank",
            workspace=data.workspace
        )
        
    except psycopg2.OperationalError as e:
        error_detail = str(e).strip()
        return WorkspaceValidationResponse(
            exists=False,
            message=(
                f"Verbindungsfehler zur Geoserver PostGIS-Datenbank: "
                f"Host={data.db_host}, Port={data.db_port}, Database={data.db_name}. "
                f"Details: {error_detail}"
            ),
            workspace=data.workspace
        )
    except psycopg2.Error as e:
        return WorkspaceValidationResponse(
            exists=False,
            message=f"Datenbankfehler: {str(e)}",
            workspace=data.workspace
        )
    except Exception as e:
        return WorkspaceValidationResponse(
            exists=False,
            message=f"Fehler bei der Validierung: {str(e)}",
            workspace=data.workspace
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
