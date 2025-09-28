from django.contrib import admin
from .models import Category, Product, Review

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'parent')
    search_fields = ('name', 'description')
    list_filter = ('parent',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'discount_price', 'inventory', 'is_active', 'average_rating', 'total_reviews', 'created_at')
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    list_editable = ('inventory', 'is_active')
    readonly_fields = ('average_rating', 'total_reviews')
    date_hierarchy = 'created_at'
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'title', 'sentiment', 'sentiment_confidence', 'verified_purchase', 'created_at')
    list_filter = ('rating', 'sentiment', 'verified_purchase', 'created_at', 'product__category')
    search_fields = ('product__name', 'user__username', 'title', 'comment')
    readonly_fields = ('verified_purchase', 'sentiment_analyzed_at', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('product', 'user')

# ProductImageAdmin has been removed as ProductImage model no longer exists
