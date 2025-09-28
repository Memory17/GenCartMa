from rest_framework import viewsets, permissions, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db.models import Avg, Count, Q  # Added Q
from django.utils.text import slugify  # Added slugify
import cloudinary
import cloudinary.uploader
import time
from .models import Category, Product, Review
from .serializers import CategorySerializer, ProductSerializer, ProductListSerializer, ReviewSerializer
from .filters import ProductFilter
from orders.models import OrderItem
from sentiment_analysis.services import SentimentAnalysisService

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category model
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = []  # use dynamic in get_permissions
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'products']:
            return [permissions.AllowAny()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        """
        Create a new category with better error handling
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Creating category with data: {request.data}")
        
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                logger.info("Category data is valid")
                category = serializer.save()
                logger.info(f"Category created successfully: {category.name}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Category validation failed: {serializer.errors}")
                return Response({
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating category: {str(e)}")
            return Response({
                'error': 'Failed to create category',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """
        Get all products in a category
        """
        category = self.get_object()
        products = Product.objects.filter(category=category)
        serializer = ProductListSerializer(
            products,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product model
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = []  # use dynamic in get_permissions
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name', 'avg_rating', 'review_count']

    def get_permissions(self):
        public_actions = ['list', 'retrieve', 'reviews', 'sentiment_summary', 'sentiment_trends', 'sentiment_alerts', 'sentiment_overview']
        if self.action in public_actions:
            return [permissions.AllowAny()]
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_review']:
            return [permissions.IsAdminUser() if self.action != 'add_review' else permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def create(self, request, *args, **kwargs):
        """Create a new product with image upload to Cloudinary"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating product with data: {request.data}")
        logger.info(f"Files in request: {request.FILES.keys()}")
        
        try:
            # Handle image upload first if present
            primary_image_url = None
            if 'primary_image' in request.FILES:
                image_file = request.FILES['primary_image']
                logger.info(f"Uploading image: {image_file.name}, size: {image_file.size}")
                
                try:
                    # Upload to Cloudinary
                    upload_result = cloudinary.uploader.upload(
                        image_file,
                        folder="nexcart/products",
                        public_id=f"product_{request.data.get('name', 'unnamed')}_{int(time.time())}",
                        overwrite=True,
                        resource_type="image"
                    )
                    primary_image_url = upload_result['secure_url']
                    logger.info(f"Image uploaded successfully: {primary_image_url}")
                    logger.info(f"Full upload result: {upload_result}")
                except Exception as upload_error:
                    logger.error(f"Cloudinary upload failed: {upload_error}")
                    return Response({
                        'error': 'Image upload failed',
                        'details': str(upload_error)
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.info("No image file found in request")
            
            # Prepare data for serializer
            product_data = request.data.copy()
            if primary_image_url:
                product_data['primary_image'] = primary_image_url
                logger.info(f"Setting primary_image to: {primary_image_url}")
            
            logger.info(f"Final product data: {product_data}")
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                product = serializer.save()
                logger.info(f"Product created successfully: {product.id} - {product.name} - Image: {product.primary_image}")
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            else:
                logger.error(f"Product validation failed: {serializer.errors}")
                return Response({
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error creating product")
            return Response({
                'error': 'Failed to create product',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        """Update a product with optional image upload to Cloudinary"""
        import logging
        logger = logging.getLogger(__name__)
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        logger.info(f"Updating product {instance.id} with data: {request.data}")
        
        try:
            # Handle image upload if present
            primary_image_url = instance.primary_image  # Keep existing if no new image
            if 'primary_image' in request.FILES:
                image_file = request.FILES['primary_image']
                logger.info(f"Uploading new image: {image_file.name}")
                
                try:
                    # Upload to Cloudinary
                    upload_result = cloudinary.uploader.upload(
                        image_file,
                        folder="nexcart/products",
                        public_id=f"product_{instance.name}_{int(time.time())}",
                        overwrite=True,
                        resource_type="image"
                    )
                    primary_image_url = upload_result['secure_url']
                    logger.info(f"Image uploaded successfully: {primary_image_url}")
                except Exception as upload_error:
                    logger.error(f"Cloudinary upload failed: {upload_error}")
                    return Response({
                        'error': 'Image upload failed',
                        'details': str(upload_error)
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare data for serializer
            product_data = request.data.copy()
            if primary_image_url:
                product_data['primary_image'] = primary_image_url
            
            serializer = self.get_serializer(instance, data=product_data, partial=partial)
            if serializer.is_valid():
                product = serializer.save()
                logger.info(f"Product updated successfully: {product.id} - {product.name}")
                
                if getattr(instance, '_prefetched_objects_cache', None):
                    instance._prefetched_objects_cache = {}
                
                return Response(serializer.data)
            else:
                logger.error(f"Product validation failed: {serializer.errors}")
                return Response({
                    'error': 'Validation failed',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error updating product")
            return Response({
                'error': 'Failed to update product',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Product.objects.all()

        # Annotate with average rating and review count for sorting
        queryset = queryset.annotate(
            avg_rating=Avg('reviews__rating'),
            review_count=Count('reviews')
        )

        # --- New category name support start ---
        category_param = self.request.query_params.get('category')
        if category_param:
            if category_param.isdigit():
                queryset = queryset.filter(category_id=category_param)
            else:
                slug = slugify(category_param)
                queryset = queryset.filter(
                    Q(category__name__iexact=category_param) |
                    Q(category__slug__iexact=slug)
                )
        # --- New category name support end ---

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Handle custom ordering for average_rating
        ordering = self.request.query_params.get('ordering')
        if ordering == 'average_rating':
            queryset = queryset.order_by('avg_rating')
        elif ordering == '-average_rating':
            queryset = queryset.order_by('-avg_rating')

        return queryset

    def paginate_queryset(self, queryset):
        # Check if pagination should be disabled
        if self.request.query_params.get('no_pagination', '').lower() in ['true', '1', 'yes']:
            return None
        return super().paginate_queryset(queryset)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """
        Get reviews for a specific product
        """
        product = self.get_object()
        reviews = Review.objects.filter(product=product)
        serializer = ReviewSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_review(self, request, pk=None):
        """
        Add a review for a specific product
        """
        import logging
        logger = logging.getLogger(__name__)
        
        product = self.get_object()
        user = request.user
        
        logger.info(f"User {user.username} attempting to review product {product.id} ({product.name})")
        logger.info(f"Request data: {request.data}")

        # Check if user has already reviewed this product
        if Review.objects.filter(product=product, user=user).exists():
            logger.warning(f"User {user.username} already reviewed product {product.id}")
            return Response(
                {'error': 'You have already reviewed this product'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user has purchased this product
        has_purchased = OrderItem.objects.filter(
            product=product,
            order__user=user,
            order__status='delivered'
        ).exists()
        
        logger.info(f"User {user.username} has_purchased product {product.id}: {has_purchased}")

        if not has_purchased:
            logger.warning(f"User {user.username} hasn't purchased product {product.id}")
            return Response(
                {'error': 'You can only review products you have purchased and received'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the review
        serializer = ReviewSerializer(data=request.data, context={'request': request})
        logger.info(f"Serializer validation: {serializer.is_valid()}")
        
        if serializer.is_valid():
            review = serializer.save(product=product)
            logger.info(f"Review {review.id} created successfully")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def can_review(self, request, pk=None):
        """
        Check if the current user can review this product
        """
        product = self.get_object()
        user = request.user

        # Check if user has already reviewed this product
        has_reviewed = Review.objects.filter(product=product, user=user).exists()
        
        # Check if user has purchased this product
        has_purchased = OrderItem.objects.filter(
            product=product,
            order__user=user,
            order__status='delivered'
        ).exists()

        return Response({
            'can_review': has_purchased and not has_reviewed,
            'has_reviewed': has_reviewed,
            'has_purchased': has_purchased
        })

    @action(detail=True, methods=['get'])
    def sentiment_summary(self, request, pk=None):
        service = SentimentAnalysisService()
        data = service.get_product_sentiment_summary(pk)
        return Response(data)

    @action(detail=False, methods=['get'])
    def sentiment_trends(self, request):
        days = int(request.query_params.get('days', 30))
        product_id = request.query_params.get('product')
        from django.utils import timezone
        from datetime import timedelta
        from products.models import Review
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        qs = Review.objects.filter(created_at__gte=start_date, sentiment__isnull=False)
        if product_id:
            qs = qs.filter(product_id=product_id)
        # annotate by date & sentiment
        data = qs.extra({'date': "DATE(created_at)"}).values('date', 'sentiment').annotate(count=Count('id')).order_by('date')
        trends = {}
        for row in data:
            d = str(row['date'])
            trends.setdefault(d, {'positive':0,'negative':0,'neutral':0})
            trends[d][row['sentiment']] = row['count']
        dates = sorted(trends.keys())
        result = {
            'scope': 'product' if product_id else 'global',
            'product_id': int(product_id) if product_id else None,
            'dates': dates,
            'positive': [trends[d]['positive'] for d in dates],
            'neutral': [trends[d]['neutral'] for d in dates],
            'negative': [trends[d]['negative'] for d in dates]
        }
        return Response(result)

    @action(detail=False, methods=['get'])
    def sentiment_alerts(self, request):
        threshold = float(request.query_params.get('negative_percent', 40))
        service = SentimentAnalysisService()
        alert_products = []
        candidates = []
        for product in Product.objects.all()[:200]:  # limit for performance
            summary = service.get_product_sentiment_summary(product.id)
            coverage = summary.get('analysis_coverage', 0) or 0
            if coverage >= 50:
                dist = summary.get('sentiment_distribution_percent', {})
            else:
                dist = summary.get('effective_sentiment_distribution_percent', {})

            negative_pct = float(dist.get('negative', 0) or 0)
            total_reviews = int(summary.get('total_reviews', 0) or 0)

            row = {
                'product_id': product.id,
                'name': product.name,
                'negative_percent': negative_pct,
                'total_reviews': total_reviews,
            }
            candidates.append(row)
            if negative_pct >= threshold:
                alert_products.append(row)

        fallback_used = False
        if not alert_products:
            # No products above threshold. Return top 5 by negative percent (no min review count).
            candidates.sort(key=lambda x: x['negative_percent'], reverse=True)
            alert_products = candidates[:5]
            fallback_used = True

        return Response({'alerts': alert_products, 'threshold': threshold, 'fallback': fallback_used})

    @action(detail=False, methods=['get'])
    def sentiment_overview(self, request):
        from products.models import Review
        reviews = Review.objects.filter(sentiment__isnull=False)
        total = reviews.count()
        if total == 0:
            return Response({
                'scope': 'global',
                'total_reviews': 0,
                'sentiment_counts': {'positive': 0, 'neutral': 0, 'negative': 0},
                'sentiment_distribution': {'positive': 0, 'neutral': 0, 'negative': 0},
                'average_confidence': 0,
                'overall_sentiment': 'neutral'
            })
        counts = {
            'positive': reviews.filter(sentiment='positive').count(),
            'neutral': reviews.filter(sentiment='neutral').count(),
            'negative': reviews.filter(sentiment='negative').count(),
        }
        distribution = {k: (v/total)*100 for k, v in counts.items()}
        from django.db.models import Avg
        avg_conf = reviews.aggregate(a=Avg('sentiment_confidence'))['a'] or 0
        overall = max(counts, key=counts.get)
        return Response({
            'scope': 'global',
            'total_reviews': total,
            'sentiment_counts': counts,
            'sentiment_distribution': distribution,
            'average_confidence': avg_conf,
            'overall_sentiment': overall
        })

class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Review model
    """
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        # Users can only see their own reviews unless they're viewing a specific product
        user = self.request.user
        if user.is_staff:
            return Review.objects.all()
        
        product_id = self.request.query_params.get('product')
        if product_id:
            # If viewing reviews for a specific product, show all reviews
            return Review.objects.filter(product_id=product_id)
        else:
            # Otherwise, show only user's own reviews
            return Review.objects.filter(user=user)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Check if user has purchased the product
        product = serializer.validated_data['product']
        user = self.request.user

        has_purchased = OrderItem.objects.filter(
            product=product,
            order__user=user,
            order__status='delivered'
        ).exists()

        if not has_purchased:
            raise serializers.ValidationError(
                'You can only review products you have purchased and received'
            )

        # Check if user has already reviewed this product
        if Review.objects.filter(product=product, user=user).exists():
            raise serializers.ValidationError(
                'You have already reviewed this product'
            )

        serializer.save(user=user)

    def perform_update(self, serializer):
        # Only allow users to update their own reviews
        if serializer.instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('You can only update your own reviews')
        serializer.save()

    def perform_destroy(self, instance):
        # Only allow users to delete their own reviews
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied('You can only delete your own reviews')
        instance.delete()

    @action(detail=False, methods=['get'])
    def sentiment_trends(self, request):
        days = int(request.query_params.get('days', 30))
        product_id = request.query_params.get('product')
        from django.utils import timezone
        from datetime import timedelta
        from products.models import Review
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        qs = Review.objects.filter(created_at__gte=start_date, sentiment__isnull=False)
        if product_id:
            qs = qs.filter(product_id=product_id)
        # annotate by date & sentiment
        data = qs.extra({'date': "DATE(created_at)"}).values('date', 'sentiment').annotate(count=Count('id')).order_by('date')
        trends = {}
        for row in data:
            d = str(row['date'])
            trends.setdefault(d, {'positive':0,'negative':0,'neutral':0})
            trends[d][row['sentiment']] = row['count']
        dates = sorted(trends.keys())
        result = {
            'scope': 'product' if product_id else 'global',
            'product_id': int(product_id) if product_id else None,
            'dates': dates,
            'positive': [trends[d]['positive'] for d in dates],
            'neutral': [trends[d]['neutral'] for d in dates],
            'negative': [trends[d]['negative'] for d in dates]
        }
        return Response(result)
