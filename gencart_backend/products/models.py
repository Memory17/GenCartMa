from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='children', blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base = slugify(self.name)
            slug_candidate = base or 'product'
            # Ensure uniqueness by appending -1, -2, ... if needed
            from django.db.models import Q
            n = 1
            while Product.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                slug_candidate = f"{base}-{n}"
                n += 1
            self.slug = slug_candidate
        super().save(*args, **kwargs)

class Product(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    inventory = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # New CDN image URL (e.g., Cloudinary secure_url)
    primary_image = models.URLField(blank=True, null=True, help_text="Primary product image (CDN URL)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def image_url(self):
        """Return the preferred image URL.

        Priority order:
        1. Explicit primary_image (Cloudinary or other CDN)
        2. Generated placeholder based on category (legacy behavior)
        """
        if self.primary_image:
            return self.primary_image
        category_colors = {
            'Electronics': '2196F3',
            'Clothing': '4CAF50',
            'Home & Kitchen': 'FF9800',
            'Books': '9C27B0',
            'Sports & Outdoors': 'F44336',
            'Phone & Accessories': '009688',
        }
        category_name = self.category.name if self.category else 'Product'
        color = category_colors.get(category_name, '607D8B')
        return f"https://placehold.co/600x400/{color}/FFFFFF?text={category_name.replace(' ', '+')}"

    @property
    def average_rating(self):
        qs = getattr(self, 'reviews', None)
        if qs is not None:
            count = qs.count()
            if count:
                return qs.aggregate(models.Avg('rating'))['rating__avg'] or 0
        return 0

    @property
    def total_reviews(self):
        qs = getattr(self, 'reviews', None)
        return qs.count() if qs is not None else 0

class Review(models.Model):
    SENTIMENT_CHOICES = [
        ('positive', 'Positive'),
        ('negative', 'Negative'),
        ('neutral', 'Neutral'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField()
    verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    sentiment = models.CharField(
        max_length=10, 
        choices=SENTIMENT_CHOICES, 
        null=True, 
        blank=True,
        help_text="Automatically determined sentiment of the review"
    )
    sentiment_confidence = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Confidence score of the sentiment prediction (0-1)"
    )
    sentiment_scores = models.JSONField(
        null=True, 
        blank=True,
        help_text="Detailed probability scores for each sentiment category"
    )
    sentiment_analyzed_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When the sentiment analysis was last performed"
    )

    class Meta:
        unique_together = ('product', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.user.username} for {self.product.name}"

    def save(self, *args, **kwargs):
        from orders.models import OrderItem
        has_purchased = OrderItem.objects.filter(
            product=self.product,
            order__user=self.user,
            order__status='delivered'
        ).exists()
        self.verified_purchase = has_purchased
        
        if self.sentiment and not self.sentiment_analyzed_at:
            from django.utils import timezone
            self.sentiment_analyzed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def sentiment_display(self):
        if self.sentiment and self.sentiment_confidence:
            return f"{self.get_sentiment_display()} ({self.sentiment_confidence:.1%})"
        return "Not analyzed"
    
    @property
    def sentiment_emoji(self):
        emoji_map = {
            'positive': '😊',
            'negative': '😞',
            'neutral': '😐'
        }
        return emoji_map.get(self.sentiment, '❓')
    
    def get_sentiment_color(self):
        color_map = {
            'positive': '#52c41a',
            'negative': '#ff4d4f',
            'neutral': '#faad14'
        }
        return color_map.get(self.sentiment, '#d9d9d9')
