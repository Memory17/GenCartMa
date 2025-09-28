import React from "react";
import { Typography } from "antd";
import { StarFilled } from "@ant-design/icons";

const { Text } = Typography;

const RatingStars = ({ rating, total, size = 14 }) => {
  // Always return a container to reserve vertical space so buttons align
  if (!rating || rating <= 0) {
    return (
      <div
        className="rating-stars placeholder"
        style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}
      >
        {/* placeholder keeps height */}
      </div>
    );
  }
  const rounded = Math.round(rating);
  return (
    <div
      className="rating-stars"
      style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}
    >
      <div className="stars" style={{ display: "flex", gap: 2 }}>
        {[...Array(5)].map((_, i) => (
          <StarFilled
            key={i}
            style={{
              color: i < rounded ? "#fbbf24" : "#e5e7eb",
              fontSize: size,
            }}
          />
        ))}
      </div>
      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
        {rating} ({total || 0})
      </Text>
    </div>
  );
};

export default RatingStars;
