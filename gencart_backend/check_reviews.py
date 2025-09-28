#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexcart_backend.settings')
django.setup()

from products.models import Product, Review

print("Products with reviews:")
for p in Product.objects.filter(reviews__isnull=False).distinct()[:5]:
    print(f"Product {p.id}: {p.name} - {p.reviews.count()} reviews")

print("\nFirst product reviews:")
first_product_with_reviews = Product.objects.filter(reviews__isnull=False).first()
if first_product_with_reviews:
    print(f"Product {first_product_with_reviews.id}: {first_product_with_reviews.name}")
    for review in first_product_with_reviews.reviews.all()[:3]:
        print(f"  - Review by {review.user.username}: {review.rating}/5 - {review.comment[:50]}...")
