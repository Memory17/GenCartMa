from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta

from products.models import Product, Category
from orders.models import Order, OrderItem
from products.serializers import ProductSerializer, CategorySerializer
from orders.serializers import OrderSerializer, OrderItemSerializer
from users.serializers import UserSerializer

User = get_user_model()

# Check if user is admin
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_admin_status(request):
    """Check if the current user has admin privileges"""
    is_admin = request.user.is_staff or request.user.is_superuser
    return Response({'is_admin': is_admin})

# Dashboard statistics
@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard_stats(request):
    """Get dashboard statistics for admin"""
    # Count total orders
    total_orders = Order.objects.count()

    # Count total users
    total_users = User.objects.count()

    # Count total products
    total_products = Product.objects.count()

    # Calculate total revenue
    total_revenue = Order.objects.filter(status__in=['processing', 'shipped', 'delivered']).aggregate(
        total=Sum('total_amount')
    )['total'] or 0

    # Get recent orders
    recent_orders = Order.objects.order_by('-created_at')[:10]
    recent_orders_data = OrderSerializer(recent_orders, many=True, context={'request': request}).data
    print("Recent orders data:", recent_orders_data)

    return Response({
        'totalOrders': total_orders,
        'totalUsers': total_users,
        'totalProducts': total_products,
        'totalRevenue': total_revenue,
        'recentOrders': recent_orders_data
    })

# Admin Product ViewSet
class AdminProductViewSet(viewsets.ModelViewSet):
    """ViewSet for managing products (admin only)"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    def upload_image(self, request, pk=None):
        """Upload an image for a product"""
        product = self.get_object()

        # Log request data for debugging
        print("Upload image request data:", request.data)
        print("Upload image request FILES:", request.FILES)

        # Extract image from request data
        image = request.FILES.get('image')
        print("Upload image found:", image)

        if not image:
            return Response(
                {'error': 'No image provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Save image directly to the product
            product.image = image
            product.save()
            print("Image saved directly to product:", product.id)

            # Get the updated product with the image
            serializer = self.get_serializer(product)
            product_data = serializer.data

            # Add the image URL to the response
            image_url = request.build_absolute_uri(product.image.url)
            product_data['image_url'] = image_url

            return Response({
                'success': True,
                'product': product_data,
                'image_url': image_url
            })
        except Exception as e:
            print("Error uploading product image:", str(e))
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """Custom create method to handle image upload"""
        # Log request data for debugging
        print("Request data:", request.data)
        print("Request FILES:", request.FILES)

        # Extract image from request data
        image = request.FILES.get('image')
        print("Image found:", image)

        # Create the product
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # If image is provided, add it to the validated data
        if image:
            print("Adding image to product data")
            # We don't need to modify validated_data as the image will be saved directly

        product = serializer.save()
        print("Product created:", product.id, product.name)

        # Save image directly to the product if image was uploaded
        if image:
            print("Saving image directly to product:", image)
            try:
                # Save image directly to the product
                product.image = image
                product.save()
                print("Image saved directly to product:", product.id)

                # Verify the image was saved
                print("Saved image path:", product.image.path if product.image else "No image path")
            except Exception as e:
                print("Error saving product image:", str(e))
                import traceback
                traceback.print_exc()
        else:
            print("No image found in request")

        # Re-serialize to include the image URL
        updated_serializer = self.get_serializer(product)
        headers = self.get_success_headers(updated_serializer.data)
        return Response(updated_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Custom update method to handle image upload"""
        # Log request data for debugging
        print("Update request data:", request.data)
        print("Update request FILES:", request.FILES)

        # Extract image from request data
        image = request.FILES.get('image')
        print("Update image found:", image)

        # Update the product
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        print("Product updated:", product.id, product.name)

        # Update product image if image was uploaded
        if image:
            print("Updating product image with:", image)
            try:
                # Save image directly to the product
                product.image = image
                product.save()
                print("Image saved directly to product:", product.id)

                # Verify the image was saved
                print("Saved image path:", product.image.path if product.image else "No image path")
            except Exception as e:
                print("Error updating product image:", str(e))
                import traceback
                traceback.print_exc()
        else:
            print("No image found in update request")

        # Re-serialize to include the updated image URL
        updated_serializer = self.get_serializer(product)
        return Response(updated_serializer.data)

# Admin Category ViewSet
class AdminCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing categories (admin only)"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

# Admin Order ViewSet
class AdminOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing orders (admin only)"""
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        status_value = request.data.get('status')

        if not status_value:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)

        if status_value not in ['pending', 'processing', 'shipped', 'delivered', 'cancelled']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = status_value
        order.save()

        return Response(OrderSerializer(order, context={'request': request}).data)

# Admin User ViewSet
class AdminUserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users (admin only)"""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """Change user password"""
        user = self.get_object()
        password = request.data.get('password')

        if not password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        return Response({'success': True})

    @action(detail=True, methods=['get'])
    def orders(self, request, pk=None):
        """Get orders for a specific user"""
        user = self.get_object()
        orders = Order.objects.filter(user=user).order_by('-created_at')
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response({'results': serializer.data})
