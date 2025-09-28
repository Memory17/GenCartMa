from django.contrib import admin
from .models import Payment, StripePayment

class StripePaymentInline(admin.StackedInline):
    model = StripePayment
    extra = 0

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'order', 'payment_method', 'amount', 'status', 'created_at')
    list_filter = ('payment_method', 'status', 'created_at')
    search_fields = ('user__username', 'user__email', 'transaction_id')
    date_hierarchy = 'created_at'
    inlines = [StripePaymentInline]
    list_select_related = ('user', 'order')
