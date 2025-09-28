import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
  Spin,
  message,
  Form,
  Input,
} from "antd";
import {
  ShoppingCartOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const { Title, Paragraph, Text } = Typography;

// Get category color
const getCategoryColor = (categoryName) => {
  const categoryColors = {
    Electronics: "#2196F3",
    Clothing: "#4CAF50",
    "Home & Kitchen": "#FF9800",
    Books: "#9C27B0",
    "Sports & Outdoors": "#F44336",
    "Phone & Accessories": "#009688",
  };
  return categoryColors[categoryName] || "#607D8B";
};

const getCategoryName = (product) =>
  (product?.category && product.category.name) || "Product";
const getProductImage = (product, width = 600, height = 400) => {
  if (product.image_url) return product.image_url;
  const categoryName = getCategoryName(product);
  const color = getCategoryColor(categoryName).replace("#", "");
  return `https://placehold.co/${width}x${height}/${color}/FFFFFF?text=${encodeURIComponent(
    categoryName
  )}`;
};

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleAddToCart = (product) => {
    if (product.inventory !== undefined && product.inventory <= 0) {
      message.error("This product is out of stock!");
      return;
    }
    addToCart(product);
    message.success(`${product.name} added to cart!`);
  };

  const handleImageError = (e, productName, width = 300, height = 200) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(productName || "Product", width / 2, height / 2);
    e.target.src = canvas.toDataURL();
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "http://localhost:8000/api/products/?no_pagination=true&ordering=name"
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        const allProducts = data.results || data || [];
        setFeaturedProducts(allProducts.slice(0, 8));
        const discounted = allProducts
          .filter(
            (p) =>
              p.discount_price &&
              parseFloat(p.discount_price) < parseFloat(p.price)
          )
          .slice(0, 12);
        setDiscountedProducts(discounted);
      } catch (error) {
        console.error("Error fetching products:", error);
        message.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleProductClick = (productId) => navigate(`/products/${productId}`);

  // Hero (friendlier palette & centered composition)
  const Hero = () => (
    <section
      style={{
        padding: "56px 0 40px",
        background:
          "linear-gradient(120deg,#f5f7ff 0%,#f2ecff 55%,#f5f7ff 100%)",
      }}
    >
      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 28px" }}>
        <Row gutter={48} align="middle">
          <Col xs={24} md={14}>
            <Space direction="vertical" size={24} style={{ width: "100%" }}>
              <div>
                <Title
                  level={1}
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: 48,
                    lineHeight: 1.05,
                    background: "linear-gradient(90deg,#4338ca,#7e22ce)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Shop smarter. Feel lighter.
                </Title>
                <Paragraph
                  style={{
                    fontSize: 18,
                    maxWidth: 560,
                    marginTop: 16,
                    color: "#475569",
                  }}
                >
                  Honest pricing, curated quality, and a calm interface designed
                  to make browsing enjoyable.
                </Paragraph>
              </div>
              <Space size={16} wrap>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate("/products")}
                  style={{
                    fontWeight: 600,
                    padding: "0 34px",
                    height: 52,
                    borderRadius: 14,
                    background: "#4f46e5",
                  }}
                >
                  Browse Products
                </Button>
                <Button
                  size="large"
                  onClick={() => navigate("/register")}
                  style={{
                    fontWeight: 600,
                    padding: "0 32px",
                    height: 52,
                    borderRadius: 14,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  Create Account
                </Button>
              </Space>
              <Row gutter={24} style={{ marginTop: 12 }}>
                {[
                  { h: "Free Shipping", p: "Over ₫500k" },
                  { h: "Warranty", p: "1 Year" },
                  { h: "Support", p: "24/7" },
                ].map((f) => (
                  <Col key={f.h} xs={8} style={{ minWidth: 120 }}>
                    <Text
                      style={{
                        display: "block",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: "#6366f1",
                      }}
                    >
                      {f.h}
                    </Text>
                    <Text strong style={{ fontSize: 14, color: "#334155" }}>
                      {f.p}
                    </Text>
                  </Col>
                ))}
              </Row>
            </Space>
          </Col>
          <Col xs={0} md={10}>
            <div
              style={{ position: "relative", width: "100%", minHeight: 320 }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 340,
                    height: 340,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 35% 35%,#ffffff 0%,#ede9fe 60%,#ddd6fe 100%)",
                    boxShadow: "0 0 0 12px rgba(255,255,255,0.6)",
                  }}
                />
                <img
                  alt="Hero"
                  src="https://media.istockphoto.com/id/1428709516/photo/shopping-online-woman-hand-online-shopping-on-laptop-computer-with-virtual-graphic-icon.jpg?s=612x612&w=0&k=20&c=ROAncmFL4lbSQdU4VOhyXu-43ngzfEqHE5ZZAw5FtYk="
                  style={{
                    width: 420,
                    height: 320,
                    objectFit: "cover",
                    borderRadius: 32,
                    position: "relative",
                    boxShadow: "0 20px 40px -18px rgba(79,70,229,.35)",
                  }}
                  onError={(e) => handleImageError(e, "Featured", 420, 320)}
                />
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );

  // Product Card
  const ProductCard = ({ product, compact = false }) => {
    const categoryName = getCategoryName(product);
    const hasDiscount =
      product.discount_price &&
      parseFloat(product.discount_price) < parseFloat(product.price);
    const inWishlist = wishlist.has(product.id);

    const toggleWishlist = (e) => {
      e.stopPropagation();
      setWishlist((prev) => {
        const next = new Set(prev);
        next.has(product.id) ? next.delete(product.id) : next.add(product.id);
        return next;
      });
    };

    const rating =
      product.average_rating ||
      (Math.round(((product.id % 5) + 3) * 10) / 10).toFixed(1);
    const ratingCount = product.review_count || ((product.id * 13) % 160) + 20;

    return (
      <Card
        onClick={() => handleProductClick(product.id)}
        style={{
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          background: "#fff",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all .28s",
        }}
        bodyStyle={{ padding: 0 }}
        hoverable
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 18px 40px -12px rgba(15,23,42,0.15)";
          e.currentTarget.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div
          style={{
            position: "relative",
            height: compact ? 150 : 200,
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            alt={product.name}
            src={getProductImage(product, 800, 600)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => handleImageError(e, product.name, 800, 600)}
          />
          <Button
            shape="circle"
            size="large"
            aria-label="wishlist"
            onClick={toggleWishlist}
            icon={
              inWishlist ? (
                <HeartFilled style={{ color: "#ef4444" }} />
              ) : (
                <HeartOutlined style={{ color: "#475569" }} />
              )
            }
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "#fff",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
          />
          {hasDiscount && (
            <div
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                background: "#dc2626",
                color: "#fff",
                padding: "4px 10px",
                fontSize: 12,
                borderRadius: 18,
                fontWeight: 600,
              }}
            >
              -
              {Math.round(
                (1 -
                  parseFloat(product.discount_price) /
                    parseFloat(product.price)) *
                  100
              )}
              %
            </div>
          )}
        </div>
        <div style={{ padding: 16 }}>
          <Text
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6366f1",
              fontWeight: 600,
            }}
          >
            {categoryName}
          </Text>
          <Text
            strong
            style={{
              display: "block",
              margin: "4px 0 6px",
              minHeight: 42,
              fontSize: 15,
              lineHeight: 1.35,
            }}
          >
            {product.name}
          </Text>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <StarFilled style={{ color: "#fbbf24" }} />
            <Text strong style={{ fontSize: 13 }}>
              {rating}
            </Text>
            <Text style={{ fontSize: 12, color: "#94a3b8" }}>
              ({ratingCount})
            </Text>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Text
              strong
              style={{
                fontSize: 18,
                color: hasDiscount ? "#dc2626" : "#111827",
              }}
            >
              ₫
              {parseFloat(
                hasDiscount ? product.discount_price : product.price
              ).toFixed(2)}
            </Text>
            {hasDiscount && (
              <Text delete style={{ color: "#94a3b8", fontSize: 13 }}>
                ₫{parseFloat(product.price).toFixed(2)}
              </Text>
            )}
          </div>
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            disabled={product.inventory !== undefined && product.inventory <= 0}
            block
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(product);
            }}
            style={{ fontWeight: 500, height: 40, borderRadius: 10 }}
          >
            {product.inventory !== undefined && product.inventory <= 0
              ? "Out of Stock"
              : "Add To Cart"}
          </Button>
        </div>
      </Card>
    );
  };

  const SectionHeader = ({ title, subtitle, action }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <div>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
          {title}
        </Title>
        {subtitle && (
          <Text style={{ color: "#64748b", fontSize: 14 }}>{subtitle}</Text>
        )}
      </div>
      {action}
    </div>
  );

  const Featured = () => (
    <section style={{ padding: "24px 0 56px", background: "#ffffff" }}>
      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 28px" }}>
        <SectionHeader
          title="Featured"
          subtitle="Curated popular picks"
          action={
            <Button
              size="small"
              onClick={() => navigate("/products")}
              style={{ borderRadius: 24 }}
            >
              View all
            </Button>
          }
        />
        {loading ? (
          <Row gutter={[20, 32]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Col key={i} xs={12} sm={8} md={6} lg={6}>
                <Card loading style={{ borderRadius: 18, height: 320 }} />
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[20, 32]}>
            {featuredProducts.map((p) => (
              <Col key={p.id} xs={12} sm={8} md={6} lg={6}>
                <ProductCard product={p} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </section>
  );

  const Deals = () =>
    discountedProducts.length === 0 ? null : (
      <section style={{ padding: "56px 0", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 28px" }}>
          <SectionHeader
            title="Deals"
            subtitle="Limited discounts"
            action={
              <Button
                size="small"
                onClick={() => navigate("/products")}
                style={{ borderRadius: 24 }}
              >
                All deals
              </Button>
            }
          />
          <Row gutter={[20, 32]}>
            {discountedProducts.slice(0, 6).map((p) => (
              <Col key={p.id} xs={12} sm={8} md={6} lg={4}>
                <ProductCard product={p} compact />
              </Col>
            ))}
          </Row>
        </div>
      </section>
    );

  const Newsletter = () => (
    <section
      style={{
        padding: "56px 0",
        background: "#ffffff",
        borderTop: "1px solid #f1f5f9",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          textAlign: "center",
          padding: "0 28px",
        }}
      >
        <Title level={3} style={{ fontWeight: 700, marginBottom: 12 }}>
          Stay in the loop
        </Title>
        <Paragraph
          style={{ margin: "0 auto 28px", maxWidth: 520, color: "#64748b" }}
        >
          Get product updates & promos. No spam.
        </Paragraph>
        <Form
          layout="inline"
          style={{ justifyContent: "center" }}
          onFinish={() => message.success("Subscribed!")}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            {" "}
            <Input
              size="large"
              placeholder="Email address"
              style={{ width: 260, borderRadius: 10 }}
            />{" "}
          </Form.Item>
          <Form.Item>
            {" "}
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              style={{
                height: 48,
                borderRadius: 12,
                padding: "0 34px",
                fontWeight: 600,
              }}
            >
              Subscribe
            </Button>{" "}
          </Form.Item>
        </Form>
      </div>
    </section>
  );

  const FinalCTA = () => (
    <section
      style={{ background: "#111827", color: "#fff", padding: "72px 0" }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          textAlign: "center",
          padding: "0 28px",
        }}
      >
        <Title
          level={2}
          style={{ color: "#fff", fontWeight: 800, marginBottom: 20 }}
        >
          Ready to explore?
        </Title>
        <Paragraph
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 16,
            margin: "0 auto 36px",
            maxWidth: 540,
          }}
        >
          Find the right item in seconds. Clean design, fast browsing, easy
          checkout.
        </Paragraph>
        <Space size="large" wrap>
          <Button
            type="primary"
            size="large"
            onClick={() => navigate("/products")}
            style={{
              fontWeight: 600,
              height: 54,
              padding: "0 40px",
              borderRadius: 16,
            }}
          >
            Browse Products
          </Button>
          <Button
            size="large"
            ghost
            onClick={() => navigate("/register")}
            style={{
              fontWeight: 600,
              height: 54,
              padding: "0 40px",
              borderRadius: 16,
              borderColor: "rgba(255,255,255,0.4)",
            }}
          >
            Create Account
          </Button>
        </Space>
      </div>
    </section>
  );

  return (
    <div>
      <Hero />
      <Featured />
      <Deals />
      <Newsletter />
      <FinalCTA />
    </div>
  );
};

export default HomePage;
