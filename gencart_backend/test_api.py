#!/usr/bin/env python3
import requests
import json

try:
    response = requests.get('http://localhost:8000/api/products/5/')
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Product: {data.get('name', 'Unknown')}")
        print(f"✅ Total reviews property: {data.get('total_reviews', 0)}")
        print(f"✅ Reviews array length: {len(data.get('reviews', []))}")
        if data.get('reviews'):
            print(f"✅ First review: {data['reviews'][0]['comment'][:50]}...")
            print(f"✅ Review user: {data['reviews'][0]['user_name']}")
        else:
            print("❌ No reviews found in API response")
    else:
        print(f"❌ API call failed with status {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"❌ Error: {e}")
