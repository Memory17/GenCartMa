import React from "react";
import { Card, Tag, Space, Button, Typography } from "antd";
import { EyeOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import RatingStars from "./RatingStars";
import PriceBlock from "./PriceBlock";
import WishlistButton from "./WishlistButton";

const { Title } = Typography;

const GridProductCard = ({
  product,
  onView,
  onAdd,
  wishlist,
  toggleWishlist,
  formatCurrency,
  discountPercent,
  getCategoryColor,
  compact = false,
}) => {
  const isPlaceholder = !product.image_url && !product.primary_image;
  return (
    <Card
      hoverable
      className="product-card"
      onClick={() => onView(product)}
      cover={
        <div
          className={`product-image-wrapper${
            isPlaceholder ? " placeholder" : ""
          }${compact ? " compact" : ""}`}
        >
          <img
            alt={product.name}
            src={
              product.image_url ||
              product.primary_image ||
              `https://placehold.co/300x240/${getCategoryColor(
                product.category_name
              ).replace("#", "")}/FFFFFF?text=${encodeURIComponent(
                product.category_name || "Product"
              )}`
            }
            onError={(e) => {
              const name = product.category_name || "Product";
              e.target.src = `https://placehold.co/300x240/${getCategoryColor(
                name
              )}/FFFFFF?text=${encodeURIComponent(name)}`;
            }}
            className="product-img"
            loading="lazy"
          />
          {discountPercent(product) && (
            <div className="discount-badge">
              {discountPercent(product)}% OFF
            </div>
          )}
          <div
            className={
              product.inventory > 0 ? "stock-badge in" : "stock-badge out"
            }
          >
            {product.inventory > 0
              ? `${product.inventory} in stock`
              : "Out of stock"}
          </div>
          <div className="category-tag">
            <Tag
              color={`#${getCategoryColor(product.category_name).replace(
                "#",
                ""
              )}`}
              className="category-pill"
            >
              {product.category?.name || product.category_name || "Product"}
            </Tag>
          </div>
          <div className="product-overlay">
            <Space size="middle">
              <Button
                type="primary"
                shape="circle"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onView(product);
                }}
              />
              <WishlistButton
                productId={product.id}
                wishlist={wishlist}
                toggle={toggleWishlist}
              />
            </Space>
          </div>
        </div>
      }
    >
      <div className="card-body">
        <Title level={5} className="product-title">
          {product.name}
        </Title>
        <RatingStars
          rating={product.average_rating}
          total={product.total_reviews}
        />
        <PriceBlock product={product} formatCurrency={formatCurrency} />
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          disabled={product.inventory <= 0}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          block
          className={product.inventory <= 0 ? "add-btn disabled" : "add-btn"}
        >
          {product.inventory <= 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </div>
    </Card>
  );
};

export default GridProductCard;
