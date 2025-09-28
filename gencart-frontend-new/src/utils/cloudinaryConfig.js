// Cloudinary configuration helper for frontend usage.
// Ensure you define VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UNSIGNED_PRESET in .env.local
// Never expose API secret in a Vite-exposed variable.

export function getCloudinaryConfig() {
  // Support both recommended keys and legacy VITE_API_* keys
  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    import.meta.env.VITE_API_CLOUDINARY_CLOUD_NAME;
  const unsignedPreset =
    import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET ||
    import.meta.env.VITE_API_CLOUDINARY_UNSIGNED_PRESET;
  if (!cloudName) throw new Error("Missing VITE_CLOUDINARY_CLOUD_NAME");
  if (!unsignedPreset)
    throw new Error("Missing VITE_CLOUDINARY_UNSIGNED_PRESET");
  return { cloudName, unsignedPreset };
}

export async function uploadImageToCloudinary(file) {
  const { cloudName, unsignedPreset } = getCloudinaryConfig();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", unsignedPreset);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Cloudinary upload failed");
  }
  return json; // includes secure_url, public_id, etc.
}

function getApiBase() {
  return import.meta.env.VITE_API_URL || "http://localhost:8000/api";
}

// Signed upload flow using backend-generated signature
export async function uploadImageToCloudinarySigned(file, folder) {
  const API = getApiBase();
  // Ask backend for a signature
  const sigRes = await fetch(`${API}/cloudinary/signature/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  const sigJson = await sigRes.json();
  if (!sigRes.ok) {
    throw new Error(sigJson.detail || "Failed to get Cloudinary signature");
  }

  const { cloud_name, api_key, timestamp, signature } = sigJson;
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);
  formData.append("api_key", api_key);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    { method: "POST", body: formData }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Cloudinary signed upload failed");
  }
  return json;
}
