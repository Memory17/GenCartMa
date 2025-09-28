import os
import time
import hashlib
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


def _sign_cloudinary_params(params: dict, api_secret: str) -> str:
	"""Generate Cloudinary v2 signature: sha1(sorted_params + api_secret).
	Only sign non-empty params, sorted by key.
	"""
	sorted_params = "&".join(
		f"{k}={v}" for k, v in sorted(params.items()) if v is not None and v != ""
	)
	to_sign = f"{sorted_params}{api_secret}"
	return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()


@api_view(["POST"])  # Keep it simple for now; restrict in production
@permission_classes([AllowAny])
def cloudinary_signature(request):
	"""
	Return a signed payload for Cloudinary direct upload.
	Body (JSON, optional): { folder: string }
	Response: { cloud_name, api_key, timestamp, folder, signature }
	"""
	cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
	api_key = os.environ.get("CLOUDINARY_API_KEY")
	api_secret = os.environ.get("CLOUDINARY_API_SECRET")

	if not cloud_name or not api_key or not api_secret:
		return Response(
			{
				"detail": "Cloudinary server configuration missing (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).",
			},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR,
		)

	folder = (request.data or {}).get("folder")
	# Cloudinary requires a timestamp for signed uploads
	timestamp = int(time.time())

	params_to_sign = {"timestamp": timestamp}
	if folder:
		params_to_sign["folder"] = folder

	signature = _sign_cloudinary_params(params_to_sign, api_secret)

	return Response(
		{
			"cloud_name": cloud_name,
			"api_key": api_key,
			"timestamp": timestamp,
			"folder": folder,
			"signature": signature,
		}
	)
