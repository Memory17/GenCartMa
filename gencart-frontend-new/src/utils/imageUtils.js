/**
 * Utility functions for handling images
 */

/**
 * Fixes image URLs from the backend
 *
 * The backend sometimes returns URLs with encoded placeholder URLs
 * This function attempts to fix those URLs or returns a fallback
 *
 * @param {string} imageUrl - The image URL from the backend
 * @param {string} productName - The product name to use for fallback
 * @param {number} width - The width of the fallback image
 * @param {number} height - The height of the fallback image
 * @returns {string} - A valid image URL
 */
// Generate a data URL for a colored box with text
const generateColoredBoxDataUrl = (text, width = 200, height = 200) => {
  // Get a consistent color based on the text
  const getColorFromText = (text) => {
    const colors = [
      "#3498db", // blue
      "#2ecc71", // green
      "#e74c3c", // red
      "#f39c12", // orange
      "#9b59b6", // purple
      "#1abc9c", // teal
      "#d35400", // dark orange
      "#c0392b", // dark red
      "#16a085", // dark teal
      "#8e44ad", // dark purple
      "#2980b9", // dark blue
      "#27ae60", // dark green
    ];

    // Simple hash function to get a consistent index
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Get a positive index within the colors array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const letter = text?.charAt(0)?.toUpperCase() || "P";
  const color = getColorFromText(text || "Product");

  // Create a canvas to draw the image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Draw text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(height * 0.6)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, width / 2, height / 2);

  // Convert to data URL
  return canvas.toDataURL("image/png");
};

export const getValidImageUrl = (
  imageUrl,
  productName,
  width = 200,
  height = 200
) => {
  // Log the input for debugging
  console.log("getValidImageUrl input:", {
    imageUrl,
    productName,
    width,
    height,
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const BACKEND_ORIGIN = API_BASE.replace(/\/?api\/?$/i, "");

  if (!imageUrl) {
    // Generate a data URL for a colored box with the first letter
    const dataUrl = generateColoredBoxDataUrl(productName, width, height);
    console.log("Using generated data URL (no image)");
    return dataUrl;
  }

  // Normalize and trim
  const raw = String(imageUrl).trim();

  // Check if the URL is a placeholder URL
  if (raw.includes("placeholder.com") || raw.includes("placehold.co")) {
    // Generate a data URL instead of using placeholder.com
    const dataUrl = generateColoredBoxDataUrl(productName, width, height);
    console.log("Replacing placeholder URL with data URL");
    return dataUrl;
  }

  // Support scheme-less URLs (e.g., //res.cloudinary.com)
  if (raw.startsWith("//")) {
    const fullUrl = `https:${raw}`;
    console.log("Normalizing scheme-less URL to HTTPS:", fullUrl);
    return fullUrl;
  }

  // Check if the URL is relative (doesn't start with http)
  if (raw && !raw.startsWith("http") && !raw.startsWith("data:")) {
    // Assume it's a relative URL and prepend the backend origin
    const fullUrl = `${BACKEND_ORIGIN}${raw.startsWith("/") ? "" : "/"}${raw}`;
    console.log("Converting relative URL to absolute:", fullUrl);
    return fullUrl;
  }

  // Return the original URL if it doesn't need fixing
  console.log("Using original URL:", raw);
  return raw;
};

/**
 * Image error handler for <img> elements
 *
 * @param {Event} event - The error event
 * @param {string} productName - The product name to use for fallback
 * @param {number} width - The width of the fallback image
 * @param {number} height - The height of the fallback image
 */
export const handleImageError = (
  event,
  productName,
  width = 200,
  height = 200
) => {
  const img = event.target;
  const originalSrc = img.src;

  console.log("Image failed to load:", originalSrc);

  // Prevent infinite error loop
  img.onerror = null;

  // Generate a data URL for a colored box with the first letter
  const dataUrl = generateColoredBoxDataUrl(productName, width, height);

  // Set fallback image
  img.src = dataUrl;
};
