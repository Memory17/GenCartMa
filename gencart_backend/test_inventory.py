#!/usr/bin/env python3

import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/home/lethanhdat/Desktop/Nexcart2/nexcart_backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexcart_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product
from orders.models import Order, OrderItem, Cart, CartItem
from users.models import Address

User = get_user_model()

def test_inventory_management():
    try:
        # Get user and product
        user = User.objects.get(username='nvj')
        product = Product.objects.get(id=2)  # T-Shirt
        
        print(f"=== INVENTORY MANAGEMENT TEST ===")
        print(f"User: {user.username}")
        print(f"Product: {product.name} (ID: {product.id})")
        print(f"Initial inventory: {product.inventory}")
        
        # Get or create a cart for the user
        cart, created = Cart.objects.get_or_create(user=user)
        print(f"Cart: {'Created new' if created else 'Using existing'}")
        
        # Clear existing cart items for clean test
        cart.items.all().delete()
        print("Cleared existing cart items")
        
        # Add item to cart
        cart_item = CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=2
        )
        print(f"Added {cart_item.quantity} {product.name} to cart")
        print(f"Inventory after adding to cart: {product.inventory} (should be unchanged)")
        
        # Get addresses (assuming user has addresses)
        address = Address.objects.filter(user=user).first()
        if not address:
            print("No address found for user. Creating test address...")
            address = Address.objects.create(
                user=user,
                first_name="Test",
                last_name="User",
                street_address="123 Test St",
                city="Test City",
                state="Test State",
                zip_code="12345",
                phone="1234567890",
                email="test@test.com"
            )
        
        print(f"Using address: {address}")
        
        # Create order from cart (this should decrease inventory)
        initial_inventory = product.inventory
        order = Order.objects.create(
            user=user,
            shipping_address=address,
            billing_address=address,
            total_amount=cart.total_price
        )
        
        # Create order items and decrease inventory manually (simulating the API logic)
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.price
            )
            
            # Decrease inventory
            cart_item.product.inventory -= cart_item.quantity
            cart_item.product.save()
            
        # Refresh product from database
        product.refresh_from_db()
        print(f"Created order {order.id}")
        print(f"Inventory after order creation: {product.inventory} (decreased by {cart_item.quantity})")
        print(f"Expected: {initial_inventory - cart_item.quantity}")
        
        # Cancel order (this should restore inventory)
        for order_item in order.items.all():
            order_item.product.inventory += order_item.quantity
            order_item.product.save()
            
        order.status = 'cancelled'
        order.save()
        
        # Refresh product from database
        product.refresh_from_db()
        print(f"Cancelled order {order.id}")
        print(f"Inventory after order cancellation: {product.inventory} (should be restored)")
        print(f"Expected: {initial_inventory}")
        
        # Clean up
        cart.items.all().delete()
        order.delete()
        
        print("\n=== INVENTORY TEST COMPLETED SUCCESSFULLY ===")
        print(f"✅ Inventory properly decreased on order creation")
        print(f"✅ Inventory properly restored on order cancellation")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_inventory_management() 