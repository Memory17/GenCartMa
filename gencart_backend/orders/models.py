from django.db import models
from django.conf import settings
from products.models import Product

class Cart(models.Model):
    """
    Cart model for storing user's shopping cart
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        username = self.user.username if self.user else "Unknown User"
        return f"{username}'s cart"

    @property
    def total_price(self):
        """Calculate total price of all items in cart"""
        return sum(item.total_price for item in self.items.all())

    @property
    def total_items(self):
        """Calculate total number of items in cart"""
        return sum(item.quantity for item in self.items.all())

class CartItem(models.Model):
    """
    CartItem model for storing items in a cart
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'product')

    def __str__(self):
        product_name = self.product.name if self.product else "Unknown Product"
        return f"{self.quantity} x {product_name} in {self.cart}"

    @property
    def total_price(self):
        """Calculate total price for this cart item"""
        if self.product is None or self.product.price is None or self.quantity is None:
            return 0
        return self.product.price * self.quantity

class Order(models.Model):
    """
    Order model for storing order details
    """
    ORDER_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending')
    shipping_address = models.ForeignKey('users.Address', on_delete=models.SET_NULL, null=True, related_name='shipping_orders')
    billing_address = models.ForeignKey('users.Address', on_delete=models.SET_NULL, null=True, related_name='billing_orders')
    payment_status = models.BooleanField(default=False)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        username = self.user.username if self.user else "Unknown User"
        return f"Order {self.id} by {username}"

    @property
    def items_total(self):
        """Calculate total price of all items in order"""
        return sum(item.total_price for item in self.items.all())

    @property
    def final_total(self):
        """Calculate final total including shipping"""
        return self.items_total + self.shipping_cost

class OrderItem(models.Model):
    """
    OrderItem model for storing items in an order
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of purchase

    def __str__(self):
        product_name = self.product.name if self.product else "Unknown Product"
        order_id = self.order.id if self.order else "Unknown Order"
        return f"{self.quantity} x {product_name} in Order {order_id}"

    @property
    def total_price(self):
        """Calculate total price for this order item"""
        if self.price is None or self.quantity is None:
            return 0
        return self.price * self.quantity
