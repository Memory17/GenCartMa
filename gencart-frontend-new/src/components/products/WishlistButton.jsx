import React from "react";
import { Button, Tooltip } from "antd";
import { HeartFilled, HeartOutlined } from "@ant-design/icons";

const WishlistButton = ({ productId, wishlist, toggle, circle = true }) => {
  const active = wishlist.includes(productId);
  return (
    <Tooltip title={active ? "Remove from Wishlist" : "Add to Wishlist"}>
      <Button
        type="primary"
        shape={circle ? "circle" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          toggle(productId);
        }}
        icon={active ? <HeartFilled /> : <HeartOutlined />}
        className={active ? "wish-btn active" : "wish-btn"}
        aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
        style={{
          background: active ? "#ef4444" : "white",
          borderColor: active ? "#ef4444" : "white",
          color: active ? "white" : "#ef4444",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        }}
      />
    </Tooltip>
  );
};

export default WishlistButton;
