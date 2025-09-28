from django_filters import rest_framework as django_filters
from django.db.models import Q
from django.utils.text import slugify
from .models import Product

class ProductFilter(django_filters.FilterSet):
    """
    Custom filter for Product model that allows filtering by category
    """
    category = django_filters.CharFilter(method='filter_category')

    def filter_category(self, queryset, name, value):
        if not value:
            return queryset
        if value.isdigit():
            return queryset.filter(category_id=value)
        slug = slugify(value)
        return queryset.filter(
            Q(category__name__iexact=value) |
            Q(category__slug__iexact=slug)
        )

    class Meta:
        model = Product
        fields = ['category']