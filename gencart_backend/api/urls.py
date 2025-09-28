from django.urls import path, include
from rest_framework.routers import DefaultRouter
from products.views import ProductViewSet, CategoryViewSet, ReviewViewSet
from orders.views import OrderViewSet, CartViewSet
from users.views import UserViewSet, AddressViewSet
from .views import cloudinary_signature

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'users', UserViewSet, basename='user')
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include('users.urls')),
    path('sentiment/', include('sentiment_analysis.urls')),
    path('cloudinary/signature/', cloudinary_signature, name='cloudinary-signature'),
]
