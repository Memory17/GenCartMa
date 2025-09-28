from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import Product
from users.models import Address
from .models import Cart, CartItem, Order, OrderItem
from .serializers import CartSerializer, CartItemSerializer, OrderSerializer, OrderItemSerializer

class CartViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Cart model
    """
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def get_object(self):
        """
        Get or create a cart for the current user
        """
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart

    @action(detail=False, methods=['get'])
    def my_cart(self, request):
        """
        Get the current user's cart
        """
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """
        Add an item to the cart with inventory validation
        """
        cart = self.get_object()
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response(
                {"detail": "Product ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quantity <= 0:
            return Response(
                {"detail": "Quantity must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if the product is already in the cart
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': 0}  # Start with 0, will be updated below
        )

        # Calculate new total quantity
        new_quantity = cart_item.quantity + quantity

        # Check inventory availability
        if new_quantity > product.inventory:
            return Response(
                {
                    "detail": f"Insufficient stock for {product.name}. Available: {product.inventory}, In cart: {cart_item.quantity}, Requested: {quantity}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update cart item quantity
        cart_item.quantity = new_quantity
        cart_item.save()

        print(f"Added {quantity} {product.name} to cart. Total in cart: {cart_item.quantity}, Available stock: {product.inventory}")

        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """
        Remove an item from the cart
        """
        cart = self.get_object()
        cart_item_id = request.data.get('cart_item_id')

        if not cart_item_id:
            return Response(
                {"detail": "Cart item ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cart_item = CartItem.objects.get(id=cart_item_id, cart=cart)
            cart_item.delete()
            serializer = CartSerializer(cart)
            return Response(serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        """
        Update the quantity of an item in the cart with inventory validation
        """
        cart = self.get_object()
        cart_item_id = request.data.get('cart_item_id')
        quantity = request.data.get('quantity')

        if not cart_item_id or not quantity:
            return Response(
                {"detail": "Cart item ID and quantity are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            quantity = int(quantity)
            if quantity <= 0:
                return Response(
                    {"detail": "Quantity must be greater than 0."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid quantity value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cart_item = CartItem.objects.get(id=cart_item_id, cart=cart)
            
            # Check inventory availability
            if quantity > cart_item.product.inventory:
                return Response(
                    {
                        "detail": f"Insufficient stock for {cart_item.product.name}. Available: {cart_item.product.inventory}, Requested: {quantity}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            old_quantity = cart_item.quantity
            cart_item.quantity = quantity
            cart_item.save()
            
            print(f"Updated {cart_item.product.name} quantity in cart: {old_quantity} -> {quantity}, Available stock: {cart_item.product.inventory}")
            
            serializer = CartSerializer(cart)
            return Response(serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def clear(self, request):
        """
        Clear all items from the cart
        """
        cart = self.get_object()
        cart.items.all().delete()
        serializer = CartSerializer(cart)
        return Response(serializer.data)

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Order model
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=user)

    @action(detail=False, methods=['post'])
    def create_from_cart(self, request):
        """
        Create a new order from the user's cart
        """
        user = request.user

        # Get the user's cart
        try:
            cart = Cart.objects.get(user=user)
        except Cart.DoesNotExist:
            return Response(
                {"detail": "Cart not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if the cart is empty
        if cart.items.count() == 0:
            return Response(
                {"detail": "Cannot create order from empty cart."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check inventory availability for all items before creating order
        inventory_errors = []
        for cart_item in cart.items.all():
            product = cart_item.product
            if product.inventory < cart_item.quantity:
                inventory_errors.append(
                    f"Insufficient stock for {product.name}. Available: {product.inventory}, Requested: {cart_item.quantity}"
                )
        
        if inventory_errors:
            return Response(
                {"detail": "Inventory insufficient", "errors": inventory_errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get shipping and billing addresses
        shipping_address_id = request.data.get('shipping_address_id')
        billing_address_id = request.data.get('billing_address_id')

        try:
            shipping_address = Address.objects.get(id=shipping_address_id, user=user)
            billing_address = Address.objects.get(id=billing_address_id, user=user)
        except Address.DoesNotExist:
            return Response(
                {"detail": "Shipping or billing address not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate total amount
        total_amount = cart.total_price

        # Create the order
        order = Order.objects.create(
            user=user,
            shipping_address=shipping_address,
            billing_address=billing_address,
            total_amount=total_amount,
            shipping_cost=0  # You can calculate shipping cost based on your business logic
        )

        # Create order items from cart items and decrease inventory
        for cart_item in cart.items.all():
            # Create order item
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.price
            )
            
            # Decrease product inventory
            product = cart_item.product
            product.inventory -= cart_item.quantity
            product.save()
            
            print(f"Decreased inventory for {product.name}: {product.inventory + cart_item.quantity} -> {product.inventory}")

        # Clear the cart
        cart.items.all().delete()

        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """
        Cancel an order and restore inventory
        """
        order = self.get_object()

        # Check if the order can be cancelled
        if order.status in ['delivered', 'cancelled']:
            return Response(
                {"detail": f"Cannot cancel order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore inventory for all order items
        for order_item in order.items.all():
            product = order_item.product
            product.inventory += order_item.quantity
            product.save()
            
            print(f"Restored inventory for {product.name}: {product.inventory - order_item.quantity} -> {product.inventory}")

        # Update order status to cancelled
        order.status = 'cancelled'
        order.save()

        serializer = self.get_serializer(order, context={'request': request})
        return Response(serializer.data)
