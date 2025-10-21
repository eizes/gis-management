from django.contrib import admin
from .models import Settings

@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ['service_name', 'website_url', 'is_active', 'updated_at']
    list_filter = ['service_name', 'is_active']
    search_fields = ['service_name', 'website_url']
