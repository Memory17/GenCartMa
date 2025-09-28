import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

const PriceBlock = ({ product, formatCurrency }) => {
  if (!product) return null;
  const current = product.discount_price || product.price;
  const hasDiscount = !!product.discount_price;
  return (
    <div
      className={`price-block${hasDiscount ? " has-discount" : " no-discount"}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        minHeight: 40, // reserve space for alignment across cards
      }}
    >
      <Text
        strong
        className="current-price"
        style={{ fontSize: 22, color: "#667eea", fontWeight: 800 }}
      >
        {formatCurrency(current)}
      </Text>
      {hasDiscount ? (
        <>
          <Text
            delete
            className="old-price"
            style={{ color: "#94a3b8", fontSize: 16, fontWeight: 500 }}
          >
            {formatCurrency(product.price)}
          </Text>
          <span
            className="save-badge"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              padding: "2px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Save {formatCurrency(product.price - product.discount_price)}
          </span>
        </>
      ) : (
        // Invisible placeholders to keep same height & horizontal spacing when no discount
        <span style={{ visibility: "hidden", display: "inline-flex", gap: 8 }}>
          <Text delete className="old-price" style={{ fontSize: 16 }}>
            {formatCurrency(product.price)}
          </Text>
          <span className="save-badge">Save 0</span>
        </span>
      )}
    </div>
  );
};

export default PriceBlock;
