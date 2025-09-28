import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Typography,
  Table,
  Button,
  InputNumber,
  Space,
  Card,
  Row,
  Col,
  Divider,
  Empty,
  Image,
  Popconfirm,
  message,
} from "antd";
import {
  DeleteOutlined,
  ShoppingOutlined,
  ArrowRightOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { getValidImageUrl, handleImageError } from "../utils/imageUtils";
import { useCart } from "../context/CartContext";

const { Title, Text } = Typography;

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } =
    useCart();

  // Handle quantity change
  const handleQuantityChange = (productId, quantity) => {
    updateQuantity(productId, quantity);
  };

  // Handle remove item
  const handleRemoveItem = (productId) => {
    removeFromCart(productId);
    message.success("Item removed from cart");
  };

  // Handle clear cart
  const handleClearCart = () => {
    clearCart();
    message.success("Cart cleared");
  };

  // Handle proceed to checkout
  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "var(--bg-primary)",
            padding: "32px",
            borderRadius: "var(--border-radius)",
            marginBottom: "24px",
            boxShadow: "var(--shadow-sm)",
            textAlign: "center",
          }}
        >
          <Title
            level={2}
            style={{ marginBottom: "8px", color: "var(--text-primary)" }}
          >
            <ShoppingOutlined
              style={{ marginRight: "12px", color: "var(--primary-color)" }}
            />
            Your Shopping Cart
          </Title>
          <Text style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
            {cartItems.length > 0
              ? `${cartItems.length} item${
                  cartItems.length > 1 ? "s" : ""
                } in your cart`
              : "Your cart is waiting for some amazing products"}
          </Text>
        </div>

        {cartItems.length > 0 ? (
          <Row gutter={[24, 24]}>
            {/* Cart Items */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Cart Items</span>
                    <Popconfirm
                      title="Clear all items from cart?"
                      description="This action cannot be undone."
                      onConfirm={handleClearCart}
                      okText="Yes, Clear"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger size="small" icon={<DeleteOutlined />}>
                        Clear All
                      </Button>
                    </Popconfirm>
                  </div>
                }
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                {cartItems.map((item, index) => (
                  <div key={item.id}>
                    <Row
                      gutter={[16, 16]}
                      align="middle"
                      style={{
                        padding: "20px 0",
                        borderBottom:
                          index < cartItems.length - 1
                            ? "1px solid var(--border-color)"
                            : "none",
                      }}
                    >
                      {/* Product Image */}
                      <Col xs={24} sm={6} md={4}>
                        <div style={{ textAlign: "center" }}>
                          <Image
                            src={getValidImageUrl(
                              item.image_url ||
                                item.image ||
                                item.primary_image,
                              item.name,
                              100,
                              100
                            )}
                            alt={item.name}
                            width={100}
                            height={100}
                            style={{
                              objectFit: "cover",
                              borderRadius: "var(--border-radius-sm)",
                              boxShadow: "var(--shadow-sm)",
                            }}
                            preview={false}
                            onError={(e) =>
                              handleImageError(e, item.name, 100, 100)
                            }
                          />
                        </div>
                      </Col>

                      {/* Product Details */}
                      <Col xs={24} sm={18} md={20}>
                        <Row gutter={[16, 16]} align="middle">
                          <Col xs={24} md={10}>
                            <div>
                              <Title level={5} style={{ marginBottom: "4px" }}>
                                <Link
                                  to={`/products/${item.id}`}
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {item.name}
                                </Link>
                              </Title>
                              <Text
                                type="secondary"
                                style={{ fontSize: "13px" }}
                              >
                                {item.category_name || "Uncategorized"}
                              </Text>
                              {item.inventory && item.inventory <= 5 && (
                                <div style={{ marginTop: "4px" }}>
                                  <Text
                                    type="warning"
                                    style={{ fontSize: "12px" }}
                                  >
                                    Only {item.inventory} left in stock
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Col>

                          <Col xs={12} md={4}>
                            <div style={{ textAlign: "center" }}>
                              <Text
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-secondary)",
                                  display: "block",
                                }}
                              >
                                Price
                              </Text>
                              {item.discount_price ? (
                                <div>
                                  <Text
                                    delete
                                    style={{
                                      fontSize: "14px",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    ₫{parseFloat(item.price).toFixed(2)}
                                  </Text>
                                  <br />
                                  <Text
                                    strong
                                    style={{
                                      fontSize: "16px",
                                      color: "var(--error-color)",
                                    }}
                                  >
                                    ₫
                                    {parseFloat(item.discount_price).toFixed(2)}
                                  </Text>
                                </div>
                              ) : (
                                <Text strong style={{ fontSize: "16px" }}>
                                  ₫{parseFloat(item.price).toFixed(2)}
                                </Text>
                              )}
                            </div>
                          </Col>

                          <Col xs={12} md={4}>
                            <div style={{ textAlign: "center" }}>
                              <Text
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-secondary)",
                                  display: "block",
                                }}
                              >
                                Quantity
                              </Text>
                              <InputNumber
                                min={1}
                                max={item.inventory || 10}
                                value={item.quantity}
                                onChange={(value) =>
                                  handleQuantityChange(item.id, value)
                                }
                                style={{ width: "80px", marginTop: "4px" }}
                                size="small"
                              />
                            </div>
                          </Col>

                          <Col xs={12} md={4}>
                            <div style={{ textAlign: "center" }}>
                              <Text
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-secondary)",
                                  display: "block",
                                }}
                              >
                                Total
                              </Text>
                              <Text
                                strong
                                style={{
                                  fontSize: "18px",
                                  color: "var(--primary-color)",
                                }}
                              >
                                ₫
                                {(
                                  parseFloat(
                                    item.discount_price || item.price
                                  ) * item.quantity
                                ).toFixed(2)}
                              </Text>
                            </div>
                          </Col>

                          <Col xs={12} md={2}>
                            <div style={{ textAlign: "center" }}>
                              <Popconfirm
                                title="Remove this item?"
                                description="This will remove the item from your cart."
                                onConfirm={() => handleRemoveItem(item.id)}
                                okText="Remove"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto",
                                  }}
                                />
                              </Popconfirm>
                            </div>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                ))}

                {/* Continue Shopping */}
                <div
                  style={{
                    padding: "20px 0",
                    borderTop: "1px solid var(--border-color)",
                    marginTop: "20px",
                  }}
                >
                  <Button
                    type="default"
                    icon={<ShoppingOutlined />}
                    size="large"
                  >
                    <Link to="/products">Continue Shopping</Link>
                  </Button>
                </div>
              </Card>
            </Col>

            {/* Order Summary */}
            <Col xs={24} lg={8}>
              <Card
                title="Order Summary"
                style={{
                  position: "sticky",
                  top: "24px",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  {cartItems.map((item) => (
                    <Row
                      key={item.id}
                      justify="space-between"
                      style={{ marginBottom: "8px" }}
                    >
                      <Col>
                        <Text style={{ fontSize: "14px" }}>
                          {item.name} × {item.quantity}
                        </Text>
                      </Col>
                      <Col>
                        <Text style={{ fontSize: "14px" }}>
                          ₫
                          {(
                            parseFloat(item.discount_price || item.price) *
                            item.quantity
                          ).toFixed(2)}
                        </Text>
                      </Col>
                    </Row>
                  ))}
                </div>

                <Divider />

                <Row justify="space-between" style={{ marginBottom: "12px" }}>
                  <Col>
                    <Text style={{ fontSize: "16px" }}>Subtotal:</Text>
                  </Col>
                  <Col>
                    <Text strong style={{ fontSize: "16px" }}>
                      ₫{cartTotal.toFixed(2)}
                    </Text>
                  </Col>
                </Row>

                <Row justify="space-between" style={{ marginBottom: "12px" }}>
                  <Col>
                    <Text style={{ fontSize: "16px" }}>Shipping:</Text>
                  </Col>
                  <Col>
                    <Text type="secondary" style={{ fontSize: "14px" }}>
                      {cartTotal >= 999 ? "FREE" : "₫50"}
                    </Text>
                  </Col>
                </Row>

                {cartTotal < 999 && (
                  <div
                    style={{
                      background: "var(--warning-light)",
                      padding: "12px",
                      borderRadius: "var(--border-radius-sm)",
                      marginBottom: "16px",
                      textAlign: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: "13px",
                        color: "var(--warning-color)",
                      }}
                    >
                      Add ₫{(999 - cartTotal).toFixed(2)} more for FREE
                      shipping!
                    </Text>
                  </div>
                )}

                <Divider />

                <Row justify="space-between" style={{ marginBottom: "24px" }}>
                  <Col>
                    <Text strong style={{ fontSize: "20px" }}>
                      Total:
                    </Text>
                  </Col>
                  <Col>
                    <Text
                      strong
                      style={{
                        fontSize: "24px",
                        color: "var(--primary-color)",
                      }}
                    >
                      ₫{(cartTotal + (cartTotal >= 999 ? 0 : 50)).toFixed(2)}
                    </Text>
                  </Col>
                </Row>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<ArrowRightOutlined />}
                  onClick={handleCheckout}
                  style={{
                    height: "56px",
                    fontSize: "18px",
                    fontWeight: "600",
                    background:
                      "linear-gradient(135deg, var(--primary-color), var(--primary-hover))",
                    border: "none",
                  }}
                >
                  Proceed to Checkout
                </Button>

                {/* Security badges */}
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "20px",
                    padding: "16px",
                    background: "var(--neutral-50)",
                    borderRadius: "var(--border-radius-sm)",
                  }}
                >
                  <Space direction="vertical" size={8}>
                    <Text
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      🔒 Secure checkout powered by SSL encryption
                    </Text>
                    <Space size={16}>
                      <Text
                        style={{ fontSize: "11px", color: "var(--text-muted)" }}
                      >
                        VISA
                      </Text>
                      <Text
                        style={{ fontSize: "11px", color: "var(--text-muted)" }}
                      >
                        MASTERCARD
                      </Text>
                      <Text
                        style={{ fontSize: "11px", color: "var(--text-muted)" }}
                      >
                        UPI
                      </Text>
                    </Space>
                  </Space>
                </div>
              </Card>
            </Col>
          </Row>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              background: "var(--bg-primary)",
              borderRadius: "var(--border-radius-lg)",
              boxShadow: "var(--shadow-md)",
              margin: "20px 0",
            }}
          >
            <div style={{ marginBottom: "32px" }}>
              <InboxOutlined
                style={{
                  fontSize: "120px",
                  color: "var(--neutral-300)",
                  marginBottom: "24px",
                }}
              />
            </div>
            <Title
              level={3}
              style={{ color: "var(--text-secondary)", marginBottom: "16px" }}
            >
              Your cart is empty
            </Title>
            <Text
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "32px",
              }}
            >
              Looks like you haven't added any items to your cart yet. Start
              shopping to fill it up!
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<ShoppingOutlined />}
              style={{
                height: "52px",
                padding: "0 32px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              <Link to="/products">Start Shopping</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
