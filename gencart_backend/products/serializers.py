from rest_framework import serializers
from .models import Category, Product, Review

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Category model
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'parent']
        read_only_fields = ['id', 'slug']  # slug is auto-generated

    def validate_name(self, value):
        """
        Validate category name
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Category name cannot be empty")
        return value.strip()

    def validate(self, data):
        """
        Additional validation
        """
        # Only check uniqueness for new categories or when name is being changed
        name = data.get('name', '').strip()
        if name:
            # Check if this name already exists (case-insensitive)
            existing = Category.objects.filter(name__iexact=name)
            
            # If updating existing category, exclude it from uniqueness check
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            # Only raise error if name conflicts with existing category
            if existing.exists():
                raise serializers.ValidationError({
                    'name': 'A category with this name already exists.'
                })
        return data

    def create(self, validated_data):
        """
        Create category with auto-generated slug
        """
        # Remove image if not provided to avoid validation errors
        if 'image' in validated_data and not validated_data['image']:
            del validated_data['image']
        
        # Ensure parent is valid
        if 'parent' in validated_data and validated_data['parent']:
            if validated_data['parent'].id == self.instance.id if self.instance else None:
                raise serializers.ValidationError("Category cannot be its own parent")
        
        return super().create(validated_data)

class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for the Review model with sentiment analysis
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    sentiment_display = serializers.ReadOnlyField()
    sentiment_emoji = serializers.ReadOnlyField()
    
    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'user_name', 'user_first_name', 'user_last_name', 
                  'rating', 'title', 'comment', 'verified_purchase', 
                  'sentiment', 'sentiment_confidence', 'sentiment_scores', 'sentiment_analyzed_at',
                  'sentiment_display', 'sentiment_emoji',
                  'created_at', 'updated_at']
        read_only_fields = ['product', 'user', 'verified_purchase', 'sentiment', 'sentiment_confidence', 
                           'sentiment_scores', 'sentiment_analyzed_at', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set the user from the request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model
    """
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    image_url = serializers.SerializerMethodField()
    primary_image = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'discount_price',
                  'category', 'category_id', 'inventory', 'is_active',
                  'primary_image', 'created_at', 'updated_at', 'image_url', 
                  'reviews', 'average_rating', 'total_reviews']
    read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        # Return None since we removed the image field
        return obj.image_url

class ProductListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing products
    """
    category = CategorySerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    primary_image = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'price', 'discount_price', 'category', 
                  'primary_image', 'image_url', 'inventory', 'is_active', 'average_rating', 'total_reviews']
    read_only_fields = ['slug']

    def get_image_url(self, obj):
        # Return None since we removed the image field  
        return obj.image_url
