# backend/settings_app/models.py
from django.db import models
from encrypted_model_fields.fields import EncryptedCharField
from django.utils import timezone
from django.core.exceptions import ValidationError
import psycopg2


class Settings(models.Model):
    SERVICE_CHOICES = [
        ('geoserver', 'Geoserver'),
        ('umap', 'uMap'),
        ('traccar', 'Traccar'),
        ('keycloak', 'KeyCloak'),
    ]

    service_name = models.CharField(max_length=50, choices=SERVICE_CHOICES, unique=True)
    website_url = models.URLField(max_length=200)

    db_host = models.CharField(max_length=100, blank=True, null=True)
    db_port = models.IntegerField(default=5432, blank=True, null=True)
    db_name = models.CharField(max_length=100, blank=True, null=True)
    db_user = models.CharField(max_length=100, blank=True, null=True)
    db_password = EncryptedCharField(max_length=255, blank=True, null=True)

    service_user = models.CharField(max_length=100, blank=True, null=True)
    service_password = EncryptedCharField(max_length=255, blank=True, null=True)

    # KeyCloak spezifisch
    keycloak_realm = models.CharField(max_length=100, blank=True, null=True)
    keycloak_client_id = models.CharField(max_length=100, blank=True, null=True)
    keycloak_client_secret = EncryptedCharField(max_length=500, blank=True, null=True)

    # Geoserver spezifisch - NEUES FELD
    geoserver_workspace = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="Geoserver Arbeitsbereich",
        help_text="Schema-Name in der Geoserver PostGIS-Datenbank (z.B. 'public' oder 'cite')"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)
    updated_by = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'settings'
        verbose_name = 'Einstellung'
        verbose_name_plural = 'Einstellungen'

    def __str__(self):
        return f"{self.get_service_name_display()} Settings"

    def check_geoserver_workspace_exists(self):
        """
        Überprüft, ob das Schema (Workspace) in der Geoserver PostGIS-Datenbank existiert.
        Wird nur für service_name='geoserver' ausgeführt.
        
        Returns:
            tuple: (bool, str) - (Existiert, Fehlermeldung/Info)
        """
        # Nur für Geoserver prüfen
        if self.service_name != 'geoserver':
            return True, ""
        
        # Wenn kein Workspace angegeben, überspringen
        if not self.geoserver_workspace:
            return True, ""
        
        # Prüfe ob DB-Verbindungsparameter vorhanden sind
        if not all([self.db_host, self.db_port, self.db_name, self.db_user, self.db_password]):
            return False, "Datenbankverbindungsparameter fehlen für Workspace-Validierung"
        
        connection = None
        cursor = None
        
        try:
            # WICHTIG: Verbindung zur GEOSERVER PostGIS-Datenbank
            connection = psycopg2.connect(
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password,
                connect_timeout=5
            )
            
            cursor = connection.cursor()
            
            # Überprüfe ob Schema in der Geoserver-Datenbank existiert
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.schemata 
                    WHERE schema_name = %s
                );
            """, (self.geoserver_workspace,))
            
            exists = cursor.fetchone()[0]
            
            if not exists:
                # Liste verfügbare Schemas zur Hilfe
                cursor.execute("""
                    SELECT schema_name 
                    FROM information_schema.schemata 
                    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    ORDER BY schema_name
                    LIMIT 10;
                """)
                available_schemas = [row[0] for row in cursor.fetchall()]
                
                error_msg = (
                    f"Das Schema '{self.geoserver_workspace}' existiert nicht in der Geoserver PostGIS-Datenbank "
                    f"'{self.db_name}' auf Host '{self.db_host}'. "
                )
                
                if available_schemas:
                    error_msg += f"Verfügbare Schemas: {', '.join(available_schemas)}"
                
                return False, error_msg
            
            return True, f"Schema '{self.geoserver_workspace}' existiert in der Geoserver-Datenbank"
            
        except psycopg2.OperationalError as e:
            error_detail = str(e).strip()
            return False, (
                f"Verbindungsfehler zur Geoserver PostGIS-Datenbank: "
                f"Host={self.db_host}, Port={self.db_port}, Database={self.db_name}. "
                f"Details: {error_detail}"
            )
        except psycopg2.Error as e:
            return False, f"Datenbankfehler bei der Geoserver-Datenbank: {str(e)}"
        except Exception as e:
            return False, f"Fehler bei der Schema-Überprüfung in der Geoserver-Datenbank: {str(e)}"
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def clean(self):
        """Validierung vor dem Speichern"""
        super().clean()
        
        # Nur für Geoserver: Überprüfe ob Workspace existiert
        if self.service_name == 'geoserver' and self.geoserver_workspace:
            exists, error_message = self.check_geoserver_workspace_exists()
            
            if not exists:
                raise ValidationError({
                    'geoserver_workspace': error_message
                })

    def to_dict(self):
        result = {"website": {"url": self.website_url}}
        if self.db_host:
            result["database"] = {
                "host": self.db_host,
                "port": self.db_port,
                "database": self.db_name,
                "user": self.db_user,
                "password": self.db_password
            }
            # Geoserver: Workspace IMMER hinzufügen (auch wenn leer)
            if self.service_name == 'geoserver':
                result["database"]["workspace"] = self.geoserver_workspace or ""
                
        if self.service_user:
            result["credentials"] = {
                "user": self.service_user,
                "password": self.service_password
            }
        if self.keycloak_realm:
            result["keycloak"] = {
                "realm": self.keycloak_realm,
                "client_id": self.keycloak_client_id,
                "client_secret": self.keycloak_client_secret
            }
        return result
