# GIS Management System v2.0 🗺️

Modern web application for centralized management of GIS services including Geoserver, uMap, and Traccar.

## ✨ Features

- 🔐 **Session-based Authentication** via KeyCloak (OAuth2/OIDC)
- 🔒 **Encrypted Password Storage** for sensitive credentials
- 🎨 **Modern UI** with Tailwind CSS v3
- ⚡ **Fast API** with Django + FastAPI backend
- ⚛️ **React Frontend** with responsive design
- 📦 **One-Click Installation** script

## 🏗️ Architecture
```
Frontend (React + Tailwind)
    ↓
Nginx (Reverse Proxy)
    ↓
Backend (Django + FastAPI)
    ↓
PostgreSQL (Encrypted Data)
    ↓
KeyCloak (Authentication)
```

## 🛠️ Tech Stack

### Backend
- **Django 5.0** - Admin interface and ORM
- **FastAPI** - High-performance API endpoints
- **PostgreSQL** - Database with encrypted fields
- **Redis** - Session storage

### Frontend
- **React 18** - UI framework
- **Tailwind CSS v3** - Styling
- **Lucide React** - Icons

### Infrastructure
- **Nginx** - Web server and reverse proxy
- **Gunicorn** - WSGI server for Django
- **Uvicorn** - ASGI server for FastAPI
- **KeyCloak** - Identity and access management

## 📋 Prerequisites

- Debian 13 (or similar Linux distribution)
- Python 3.11+ (auto-detected)
- Node.js & npm
- PostgreSQL (running)
- KeyCloak instance (configured)
- Root access

## 🚀 Installation

### 1. Download and run the installation script
```bash
chmod +x install-gis-management-v2-final.sh
./install-gis-management-v2-final.sh
```

The script will:
- Install all dependencies
- Set up PostgreSQL database
- Create Python virtual environment
- Build React frontend
- Configure Nginx
- Set up SSL with Let's Encrypt
- Create systemd services

### 2. Configure KeyCloak Client Secret
```bash
bash /opt/gis-management/scripts/setup-keycloak.sh
```

### 3. KeyCloak Configuration

In KeyCloak Admin Console (https://auth.eizes.com/admin/):

**Client Settings:**
- Client ID: `eizes-gis`
- Client Protocol: `openid-connect`
- Client Authentication: `ON`
- Valid Redirect URIs: `https://gis.eizes.com/api/auth/callback`
- Web Origins: `https://gis.eizes.com`
- Standard Flow Enabled: `ON`

## 🌐 Access Points

- **Frontend**: https://gis.eizes.com/
- **Django Admin**: https://gis.eizes.com/admin/
- **API Health**: https://gis.eizes.com/api/health
- **API Docs**: https://gis.eizes.com/api/docs

## 🔧 Maintenance

### Service Management
```bash
# Check status
systemctl status gis-django
systemctl status gis-fastapi

# Restart services
systemctl restart gis-django gis-fastapi

# View logs
journalctl -u gis-fastapi -f
tail -f /var/log/gis-management/django.log
```

### Backup
```bash
# Manual backup
bash /opt/gis-management/scripts/backup.sh

# Backups are stored in
/opt/gis-management/backups/
```

## 📁 Project Structure
```
/opt/gis-management/
├── backend/
│   ├── config/              # Django settings
│   ├── settings_app/        # Settings management app
│   ├── main.py             # FastAPI application
│   └── manage.py           # Django management
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   └── index.css       # Tailwind styles
│   └── public/
├── static/                  # Production frontend build
├── media/                   # Uploaded files
├── scripts/
│   ├── setup-keycloak.sh   # KeyCloak setup
│   └── backup.sh           # Backup script
├── .env                    # Environment variables
└── venv/                   # Python virtual environment
```

## 🔐 Security Features

- ✅ Encrypted password storage in database
- ✅ Session-based authentication (no tokens in frontend)
- ✅ HttpOnly secure cookies
- ✅ HTTPS only (SSL/TLS)
- ✅ CSRF protection
- ✅ SQL injection protection (Django ORM)
- ✅ XSS protection headers

## 🐛 Troubleshooting

### Authentication Issues
1. Check KeyCloak client configuration
2. Verify redirect URIs match exactly
3. Check backend logs: `journalctl -u gis-fastapi -f`

### Service Not Starting
1. Check service status: `systemctl status gis-fastapi`
2. View detailed logs: `journalctl -xe`
3. Verify PostgreSQL is running: `systemctl status postgresql`

### Frontend Not Loading
1. Check Nginx configuration: `nginx -t`
2. Verify build files exist: `ls -la /opt/gis-management/static/`
3. Clear browser cache (Ctrl+Shift+R)

## 📝 Default Credentials

**Django Admin:**
- Username: `admin`
- Password: `admin`
- ⚠️ **CHANGE IMMEDIATELY** after first login!

**Database:**
- Database: `gis`
- User: `gis`
- Password: `gis.753`

## 🤝 Contributing

This is a private project for EIZES infrastructure management.

## 📄 License

Private - All rights reserved

## 👤 Author

**Andreas Keller**
- Email: andreas.keller@eizes.com
- Organization: EIZES

## 🔄 Version History

### v2.0.0 (October 2025)
- Complete rewrite with modern architecture
- Session-based authentication
- Simplified menu structure
- Tailwind CSS integration
- Encrypted password storage
- One-click installation

---

**Made with ❤️ for EIZES GIS Infrastructure**
