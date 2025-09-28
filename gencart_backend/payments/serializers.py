from rest_framework import serializers
from .models import Payment, StripePayment
from orders.serializers import OrderSerializer

class StripePaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for the StripePayment model
    """
    class Meta:
        model = StripePayment
        fields = ['id', 'stripe_charge_id', 'stripe_customer_id', 'stripe_payment_intent_id']

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for the Payment model
    """
    order = OrderSerializer(read_only=True)
    stripe_payment = StripePaymentSerializer(read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'order', 'payment_method', 'amount', 'status', 
                  'transaction_id', 'stripe_payment', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PaymentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new payment
    """
    order_id = serializers.PrimaryKeyRelatedField(
        source='order',
        queryset=Payment.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = Payment
        fields = ['order_id', 'payment_method', 'amount']
    
    def create(self, validated_data):
        payment = Payment.objects.create(**validated_data)
        return payment
