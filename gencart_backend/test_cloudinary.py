#!/usr/bin/env python
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gencart_backend.settings')
django.setup()

import cloudinary
import cloudinary.uploader
from django.conf import settings

def test_cloudinary():
    print("Testing Cloudinary connection...")
    
    # Check environment variables
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.environ.get('CLOUDINARY_API_KEY')
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
    
    print(f"Cloud Name: {cloud_name}")
    print(f"API Key: {api_key}")
    print(f"API Secret: {'*' * len(api_secret) if api_secret else 'None'}")
    
    if not all([cloud_name, api_key, api_secret]):
        print("❌ Missing Cloudinary credentials!")
        return False
    
    try:
        # Test upload with a sample file
        # Create a simple test image file
        from PIL import Image
        import io
        
        # Create a simple red square image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        print("\nTesting Cloudinary upload...")
        result = cloudinary.uploader.upload(
            img_bytes,
            folder="nexcart/test",
            resource_type="image"
        )
        
        print("✅ Upload successful!")
        print(f"Public ID: {result['public_id']}")
        print(f"URL: {result['secure_url']}")
        
        # Clean up test image
        cloudinary.uploader.destroy(result['public_id'])
        print("✅ Test image cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_cloudinary()