from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import RefreshToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["-created_at"]
    list_display = ["email", "display_name", "is_active", "email_verified", "created_at"]
    search_fields = ["email", "display_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("display_name", "avatar_url", "google_sub")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser", "email_verified", "deleted_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    add_fieldsets = ((None, {"fields": ("email", "password1", "password2")}),)


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "issued_at", "expires_at", "revoked_at"]
    readonly_fields = [f.name for f in RefreshToken._meta.fields]
