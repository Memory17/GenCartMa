from django.db import models
from django.conf import settings
from orders.models import Order

class Payment(models.Model):
    """
    Payment model for storing payment details
    """
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    PAYMENT_METHOD = (
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('credit_card', 'Credit Card'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.id} for Order {self.order.id}"

class StripePayment(models.Model):
    """
    StripePayment model for storing Stripe-specific payment details
    """
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='stripe_payment')
    stripe_charge_id = models.CharField(max_length=255)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Stripe Payment for {self.payment}"
