#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║    KeyCloak Client Secret in Datenbank speichern     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "WICHTIG: KeyCloak Client muss mit diesen Settings konfiguriert sein:"
echo ""
echo "Client ID: eizes-gis"
echo "Client authentication: ON"
echo "Valid Redirect URIs: https://gis.eizes.com/api/auth/callback"
echo "Web Origins: https://gis.eizes.com"
echo ""
read -p "Client Secret eingeben: " CLIENT_SECRET
echo ""

if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Kein Secret eingegeben!"
    exit 1
fi

cd /opt/gis-management/backend
su - gis-management -c "cd /opt/gis-management/backend && /opt/gis-management/venv/bin/python manage.py shell" << PYEOF
from settings_app.models import Settings

kc, created = Settings.objects.get_or_create(
    service_name='keycloak',
    defaults={
        'website_url': 'https://auth.eizes.com',
        'keycloak_realm': 'eizes',
        'keycloak_client_id': 'eizes-gis',
        'keycloak_client_secret': '$CLIENT_SECRET'
    }
)

if not created:
    kc.website_url = 'https://auth.eizes.com'
    kc.keycloak_realm = 'eizes'
    kc.keycloak_client_id = 'eizes-gis'
    kc.keycloak_client_secret = '$CLIENT_SECRET'
    kc.save()

print("✓ KeyCloak Config gespeichert (verschlüsselt in DB)")
print(f"  URL: {kc.website_url}")
print(f"  Realm: {kc.keycloak_realm}")
print(f"  Client ID: {kc.keycloak_client_id}")
print(f"  Secret: {'*' * 20} (verschlüsselt)")
PYEOF

echo ""
echo "✓ KeyCloak-Konfiguration gespeichert!"
echo ""
echo "Backend neu starten:"
echo "  systemctl restart gis-fastapi"
echo ""
