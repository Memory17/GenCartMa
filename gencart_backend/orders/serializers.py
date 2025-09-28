from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem
from products.models import Product
from products.serializers import ProductListSerializer
from users.serializers import AddressSerializer, UserSerializer

class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the CartItem model
    """
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        write_only=True,
        source='product',
        queryset=Product.objects.all()
    )
    total_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'total_price']

class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for the Cart model
    """
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_items = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'total_items', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the OrderItem model
    """
    product = ProductListSerializer(read_only=True)
    total_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price', 'total_price']
        read_only_fields = ['price']

class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Order model
    """
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = AddressSerializer(read_only=True)
    billing_address = AddressSerializer(read_only=True)
    items_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    final_total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    user = UserSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'shipping_address', 'billing_address',
                  'payment_status', 'shipping_cost', 'total_amount',
                  'tracking_number', 'items', 'items_total', 'final_total',
                  'created_at', 'updated_at']
        read_only_fields = ['total_amount', 'created_at', 'updated_at']
