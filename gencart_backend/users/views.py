from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Address
from .serializers import UserSerializer, UserCreateSerializer, AddressSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    User registration view
    """
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

class UserProfileView(APIView):
    """
    User profile view
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        # Regular users can only see their own profile
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Get the current user's profile
        """
        serializer = self.get_serializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload_avatar')
    def upload_avatar(self, request, pk=None):
        """
        Upload user avatar
        """
        user = self.get_object()

        # Check if the user is trying to update their own profile
        if request.user.id != user.id and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to update this user's avatar."},
                status=status.HTTP_403_FORBIDDEN
            )

        if 'avatar' not in request.FILES:
            return Response(
                {"detail": "No avatar file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save the avatar
        user.avatar = request.FILES['avatar']
        user.save()

        # Return the updated user data
        serializer = self.get_serializer(user, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='change_password')
    def change_password(self, request, pk=None):
        """
        Change user password
        """
        user = self.get_object()

        # Check if the user is trying to update their own password
        if request.user.id != user.id and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to change this user's password."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get password data from request
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        # Validate input
        if not old_password or not new_password or not confirm_password:
            return Response(
                {"detail": "All password fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "New password and confirm password do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if old password is correct
        if not user.check_password(old_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)

class AddressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Address model
    """
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Set the user to the current user
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def shipping(self, request):
        """
        Get all shipping addresses for the current user
        """
        addresses = Address.objects.filter(user=request.user, address_type='shipping')
        serializer = self.get_serializer(addresses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def billing(self, request):
        """
        Get all billing addresses for the current user
        """
        addresses = Address.objects.filter(user=request.user, address_type='billing')
        serializer = self.get_serializer(addresses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def default_shipping(self, request):
        """
        Get the default shipping address for the current user
        """
        try:
            address = Address.objects.get(user=request.user, address_type='shipping', default=True)
            serializer = self.get_serializer(address)
            return Response(serializer.data)
        except Address.DoesNotExist:
            return Response(
                {"detail": "No default shipping address found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def default_billing(self, request):
        """
        Get the default billing address for the current user
        """
        try:
            address = Address.objects.get(user=request.user, address_type='billing', default=True)
            serializer = self.get_serializer(address)
            return Response(serializer.data)
        except Address.DoesNotExist:
            return Response(
                {"detail": "No default billing address found."},
                status=status.HTTP_404_NOT_FOUND
            )
