export const formatCurrency = (v) => {
  if (v == null) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v);
};

export const discountPercent = (product) => {
  if (!product || !product.price || !product.discount_price) return null;
  return Math.round(
    ((product.price - product.discount_price) / product.price) * 100
  );
};
