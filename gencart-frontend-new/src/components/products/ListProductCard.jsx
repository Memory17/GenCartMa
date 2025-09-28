import React from "react";
import { Card, Row, Col, Tag, Typography, Space, Button } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import RatingStars from "./RatingStars";
import PriceBlock from "./PriceBlock";
import WishlistButton from "./WishlistButton";

const { Title, Text } = Typography;

const ListProductCard = ({
  product,
  onView,
  onAdd,
  wishlist,
  toggleWishlist,
  formatCurrency,
  discountPercent,
  getCategoryColor,
}) => (
  <Card hoverable className="product-list-card" onClick={() => onView(product)}>
    <Row gutter={[24, 24]} align="middle">
      <Col xs={24} sm={8} md={6}>
        <div className="product-image-wrapper small">
          <img
            alt={product.name}
            src={
              product.image_url ||
              product.primary_image ||
              `https://placehold.co/240x160/${getCategoryColor(
                product.category_name
              ).replace("#", "")}/FFFFFF?text=${encodeURIComponent(
                product.category_name || "Product"
              )}`
            }
            onError={(e) => {
              const name = product.category_name || "Product";
              e.target.src = `https://placehold.co/240x160/${getCategoryColor(
                name
              )}/FFFFFF?text=${encodeURIComponent(name)}`;
            }}
            className="product-img"
            loading="lazy"
          />
          {discountPercent(product) && (
            <div className="discount-badge small">
              {discountPercent(product)}% OFF
            </div>
          )}
        </div>
      </Col>
      <Col xs={24} sm={16} md={18}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={14}>
            <Tag
              color={`#${getCategoryColor(product.category_name).replace(
                "#",
                ""
              )}`}
              className="list-category-tag category-pill"
            >
              {product.category?.name || product.category_name || "Product"}
            </Tag>
            <Title level={4} className="list-title">
              {product.name}
            </Title>
            <RatingStars
              rating={product.average_rating}
              total={product.total_reviews}
            />
            <Text
              className={
                product.inventory > 0 ? "stock-text in" : "stock-text out"
              }
            >
              {product.inventory > 0
                ? `${product.inventory} in stock`
                : "Out of stock"}
            </Text>
          </Col>
          <Col xs={24} lg={10} className="list-actions">
            <PriceBlock product={product} formatCurrency={formatCurrency} />
            <Space>
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                disabled={product.inventory <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(product);
                }}
                className={
                  product.inventory <= 0 ? "mini-add disabled" : "mini-add"
                }
              >
                {product.inventory <= 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
              <WishlistButton
                productId={product.id}
                wishlist={wishlist}
                toggle={toggleWishlist}
              />
            </Space>
          </Col>
        </Row>
      </Col>
    </Row>
  </Card>
);

export default ListProductCard;
