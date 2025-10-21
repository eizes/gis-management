from django.db import models
from encrypted_model_fields.fields import EncryptedCharField
from django.utils import timezone

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
