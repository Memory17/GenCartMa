from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Address

User = get_user_model()

class AddressSerializer(serializers.ModelSerializer):
    """
    Serializer for the Address model
    """
    class Meta:
        model = Address
        fields = ['id', 'address_type', 'street_address', 'apartment_address',
                  'city', 'state', 'country', 'zip_code', 'default']

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model
    """
    addresses = AddressSerializer(many=True, read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone_number', 'addresses', 'date_joined', 'avatar', 'avatar_url']
        read_only_fields = ['date_joined', 'avatar_url']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new user
    """
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password',
                  'first_name', 'last_name', 'phone_number']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user
