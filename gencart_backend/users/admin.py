from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Address

class AddressInline(admin.TabularInline):
    model = Address
    extra = 0

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    inlines = [AddressInline]

admin.site.register(User, CustomUserAdmin)

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'address_type', 'city', 'country', 'default')
    list_filter = ('address_type', 'default', 'country')
    search_fields = ('user__username', 'street_address', 'city', 'country')
    list_select_related = ('user',)
