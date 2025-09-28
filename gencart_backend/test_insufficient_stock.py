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

def test_insufficient_stock():
    try:
        # Get user and product
        user = User.objects.get(username='nvj')
        product = Product.objects.get(id=2)  # T-Shirt
        
        print(f"=== INSUFFICIENT STOCK TEST ===")
        print(f"User: {user.username}")
        print(f"Product: {product.name} (ID: {product.id})")
        print(f"Current inventory: {product.inventory}")
        
        # Test 1: Try to add more items to cart than available in stock
        print(f"\n--- Test 1: Adding items to cart ---")
        cart, created = Cart.objects.get_or_create(user=user)
        cart.items.all().delete()  # Clear cart
        
        # Try to add more than available stock
        excessive_quantity = product.inventory + 10
        print(f"Trying to add {excessive_quantity} items (more than {product.inventory} available)")
        
        try:
            cart_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=excessive_quantity
            )
            print(f"❌ ERROR: Should not allow adding {excessive_quantity} items!")
        except Exception as e:
            print(f"✅ GOOD: Database level validation might prevent this")
        
        # Test 2: Set inventory very low and test order creation
        print(f"\n--- Test 2: Order creation with insufficient stock ---")
        
        # Set inventory to very low amount
        original_inventory = product.inventory
        product.inventory = 2
        product.save()
        print(f"Set inventory to: {product.inventory}")
        
        # Add exactly the available amount to cart
        cart.items.all().delete()
        cart_item = CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=2  # Exactly what's available
        )
        print(f"Added {cart_item.quantity} items to cart (exactly what's available)")
        
        # Try to create order - this should work
        address = Address.objects.filter(user=user).first()
        order = Order.objects.create(
            user=user,
            shipping_address=address,
            billing_address=address,
            total_amount=cart.total_price
        )
        
        # Create order items and decrease inventory
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
        
        product.refresh_from_db()
        print(f"✅ Order created successfully. New inventory: {product.inventory}")
        
        # Test 3: Try to create another order when stock is 0
        print(f"\n--- Test 3: Try ordering when out of stock ---")
        cart.items.all().delete()
        
        try:
            cart_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=1
            )
            print(f"❌ ERROR: Should not allow adding items when out of stock!")
        except Exception as e:
            print(f"✅ GOOD: Cannot add to cart when out of stock")
        
        # Restore inventory and clean up
        print(f"\n--- Cleanup ---")
        product.inventory = original_inventory
        product.save()
        cart.items.all().delete()
        order.delete()
        print(f"Restored inventory to: {product.inventory}")
        
        print(f"\n=== INSUFFICIENT STOCK TEST COMPLETED ===")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_insufficient_stock() 