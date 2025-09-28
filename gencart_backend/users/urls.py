from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views
from .views_auth import CustomTokenObtainPairView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.UserProfileView.as_view(), name='user_profile'),
]

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_admin(request):
    user = request.user if request.user.is_authenticated else None
    return Response({'is_admin': bool(user and (user.is_staff or user.is_superuser)), 'authenticated': bool(user)})

urlpatterns += [
    path('check_admin/', check_admin, name='check_admin'),
]