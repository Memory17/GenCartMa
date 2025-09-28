import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Layout,
  Menu,
  Button,
  Badge,
  Input,
  Drawer,
  Space,
  Avatar,
  message,
  Divider,
} from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  SearchOutlined,
  MenuOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useCart } from "../../context/CartContext";
import "./UserMenu.css";

const { Header: AntHeader } = Layout;
const { Search } = Input;

const Header = () => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const navigate = useNavigate();

  // Get cart data from context
  const { cartCount } = useCart();

  // Check if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  // Check login status on component mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const loggedIn = !!token;
    setIsLoggedIn(loggedIn);

    // If logged in, fetch user data
    if (loggedIn) {
      const fetchUserData = async () => {
        try {
          const response = await fetch("http://localhost:8000/api/users/me/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUserData(data);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear tokens and any user data from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");

    // Update state
    setIsLoggedIn(false);
    setUserData(null);

    // Redirect to home page
    navigate("/");

    // Show success message
    message.success("Logged out successfully");
  };

  // No longer needed with offcanvas menu

  const showMobileMenu = () => {
    setMobileMenuVisible(true);
  };

  const closeMobileMenu = () => {
    setMobileMenuVisible(false);
  };

  const showUserMenu = () => {
    console.log("Opening user menu");
    setUserMenuVisible(true);
  };

  const closeUserMenu = () => {
    setUserMenuVisible(false);
  };

  const handleSearch = (value) => {
    if (value) {
      navigate(`/products?search=${value}`);
    }
  };

  // Check if user is admin
  const isAdmin =
    userData &&
    (userData.is_staff || userData.is_superuser || userData.username === "nvj");

  const menuItems = [
    {
      key: "home",
      label: (
        <Link
          to="/"
          style={{
            fontWeight: "600",
          }}
        >
          <span style={{ color: "black" }}>Home</span>
        </Link>
      ),
    },
    {
      key: "products",
      label: (
        <Link
          to="/products"
          style={{
            fontWeight: "600",
          }}
        >
          <span style={{ color: "black" }}>Products</span>
        </Link>
      ),
    },
    // Add admin link if user is admin
    ...(isAdmin
      ? [
          {
            key: "admin",
            label: (
              <Link
                to="/admin"
                style={{
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Admin
              </Link>
            ),
          },
        ]
      : []),
  ];

  // User menu items are now directly in the offcanvas menu

  // We've moved these elements directly into the header layout

  return (
    <>
      <AntHeader
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          padding: "0",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          height: "clamp(64px, 10vw, 72px)", // Responsive header height
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 clamp(12px, 3vw, 24px)", // Responsive horizontal padding
            height: "100%",
          }}
        >
          {/* Logo and Main Menu */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: "0 0 auto",
            }}
          >
            <div className="logo" style={{ marginRight: "clamp(16px, 4vw, 40px)" }}>
              <Link to="/" style={{ textDecoration: "none" }}>
                <h1
                  style={{
                    color: "white",
                    margin: 0,
                    fontSize: "clamp(20px, 4.5vw, 32px)", // Responsive logo size
                    fontWeight: "800",
                    letterSpacing: "-1px",
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.05)";
                    e.target.style.textShadow = "0 4px 12px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.textShadow = "0 2px 8px rgba(0,0,0,0.3)";
                  }}
                >
                  GenCart
                </h1>
              </Link>
            </div>

            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={["home"]}
              items={menuItems}
              className="desktop-menu" // Add class for responsive hiding
              style={{
                border: "none",
                background: "white",
                fontSize: "clamp(14px, 2.2vw, 16px)", // Responsive menu text
                lineHeight: "clamp(64px, 10vw, 72px)",
                minWidth: "auto",
                height: "clamp(64px, 10vw, 72px)",
                display: "flex",
                alignItems: "center",
              }}
            />
          </div>

          {/* Search, Cart and User */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(8px, 2vw, 16px)", // Responsive gap
              flex: "0 0 auto",
            }}
          >
            {/* Login Button for non-logged in users */}
            {!isLoggedIn && (
              <Link to="/login" className="desktop-login"> {/* Add class for responsive control */}
                <Button
                  type="primary"
                  size="large"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.3)",
                    color: "white",
                    fontWeight: "700",
                    borderRadius: "clamp(8px, 1.5vw, 12px)", // Responsive border radius
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    backdropFilter: "blur(10px)",
                    padding: "0 clamp(16px, 3vw, 24px)", // Responsive padding
                    height: "clamp(36px, 6vw, 44px)", // Responsive height
                    fontSize: "clamp(12px, 2vw, 14px)", // Responsive font size
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.25)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.15)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                >
                  Login
                </Button>
              </Link>
            )}

            {/* Cart Button */}
            <Link to="/cart">
              <div
                style={{
                  position: "relative",
                  padding: "clamp(8px, 1.5vw, 12px)", // Responsive padding
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "clamp(12px, 2vw, 16px)", // Responsive border radius
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  minWidth: "clamp(40px, 6vw, 52px)", // Responsive minimum size
                  minHeight: "clamp(40px, 6vw, 52px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.transform =
                    "translateY(-3px) scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                }}
              >
                <Badge
                  count={cartCount}
                  size="small"
                  showZero={false}
                  style={{
                    backgroundColor: "#ff6b6b",
                    boxShadow: "0 2px 8px rgba(255,107,107,0.4)",
                    border: "2px solid white",
                  }}
                  offset={[2, -2]}
                >
                  <ShoppingCartOutlined
                    style={{
                      fontSize: "clamp(16px, 2.5vw, 18px)", // Responsive icon size
                      color: "black",
                    }}
                  />
                </Badge>
              </div>
            </Link>

            {/* User Avatar */}
            <div
              style={{
                padding: "clamp(4px, 1vw, 6px)", // Responsive padding
                background: "rgba(255,255,255,0.15)",
                borderRadius: "clamp(12px, 2vw, 16px)", // Responsive border radius
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                e.currentTarget.style.transform =
                  "translateY(-3px) scale(1.05)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <Avatar
                icon={<UserOutlined />}
                src={userData?.avatar_url}
                style={{
                  cursor: "pointer",
                  backgroundColor: isLoggedIn
                    ? userData?.avatar_url
                      ? "transparent"
                      : "#1677ff"
                    : "#64748b",
                  color: "white",
                  fontSize: "clamp(16px, 2.5vw, 18px)", // Responsive icon size
                  border: "3px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease",
                }}
                size={`clamp(36px, 6vw, 44px)`} // Responsive avatar size
                onClick={() => {
                  console.log("Avatar clicked");
                  showUserMenu();
                }}
              />
            </div>

            {/* Mobile Menu Button */}
            <div
              className="mobile-menu-button"
              style={{
                display: "none",
                marginLeft: "clamp(4px, 1vw, 8px)", // Responsive margin
              }}
            >
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={showMobileMenu}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  color: "white",
                  borderRadius: "clamp(8px, 1.5vw, 12px)", // Responsive border radius
                  width: "clamp(40px, 6vw, 48px)", // Responsive size
                  height: "clamp(40px, 6vw, 48px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(10px)",
                  fontSize: "clamp(16px, 2.5vw, 18px)", // Responsive icon size
                }}
              />
            </div>
          </div>
        </div>
      </AntHeader>

      {/* Mobile Menu Drawer */}
      <Drawer
        title={
          <div
            style={{
              color: "#1a202c",
              fontSize: "clamp(18px, 3vw, 20px)", // Responsive title
              fontWeight: "700",
            }}
          >
            Navigation Menu
          </div>
        }
        placement="right"
        onClose={closeMobileMenu}
        open={mobileMenuVisible}
        styles={{
          body: {
            padding: "0",
            background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
          },
          header: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            color: "white",
          },
        }}
        width={`min(320px, 85vw)`} // Responsive drawer width
      >
        <div style={{ padding: "clamp(16px, 3vw, 20px) 0" }}>
          {/* Mobile Search */}
          <div style={{ padding: "0 clamp(16px, 3vw, 20px) clamp(16px, 3vw, 20px) clamp(16px, 3vw, 20px)" }}>
            <Search
              placeholder="Search products..."
              onSearch={(value) => {
                handleSearch(value);
                closeMobileMenu();
              }}
              style={{ width: "100%" }}
              size="large"
              className="mobile-search"
            />
          </div>

          <Menu
            mode="vertical"
            defaultSelectedKeys={["home"]}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "clamp(15px, 2.5vw, 16px)", // Responsive menu text
            }}
          >
            {menuItems.map((item) => (
              <Menu.Item
                key={item.key}
                onClick={closeMobileMenu}
                style={{
                  margin: "4px 16px",
                  borderRadius: "12px",
                  height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {item.label}
              </Menu.Item>
            ))}

            <Menu.Divider style={{ margin: "16px 0" }} />

            <Menu.Item
              key="cart"
              onClick={closeMobileMenu}
              style={{
                margin: "4px 16px",
                borderRadius: "12px",
                height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                display: "flex",
                alignItems: "center",
              }}
            >
              <Link
                to="/cart"
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  color: "#1a202c",
                  textDecoration: "none",
                }}
              >
                <Space>
                  <ShoppingCartOutlined style={{ fontSize: "clamp(16px, 2.5vw, 18px)" }} />
                  <span style={{ fontWeight: "600" }}>Cart</span>
                  {cartCount > 0 && (
                    <Badge
                      count={cartCount}
                      style={{
                        backgroundColor: "#ff6b6b",
                        boxShadow: "0 2px 4px rgba(255,107,107,0.3)",
                      }}
                    />
                  )}
                </Space>
              </Link>
            </Menu.Item>

            {!isLoggedIn && (
              <Menu.Item
                key="login"
                onClick={closeMobileMenu}
                style={{
                  margin: "16px",
                  height: "auto",
                }}
              >
                <Link to="/login" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      borderRadius: "12px",
                      height: "clamp(44px, 7vw, 48px)", // Responsive button height
                      fontSize: "clamp(15px, 2.5vw, 16px)", // Responsive button text
                      fontWeight: "700",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    Login to Your Account
                  </Button>
                </Link>
              </Menu.Item>
            )}

            <Menu.Divider style={{ margin: "16px 0" }} />

            <Menu.Item
              key="about"
              onClick={closeMobileMenu}
              style={{
                margin: "4px 16px",
                borderRadius: "12px",
                height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                display: "flex",
                alignItems: "center",
              }}
            >
              <Link
                to="/about"
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  color: "#1a202c",
                  textDecoration: "none",
                }}
              >
                <Space>
                  <InfoCircleOutlined style={{ fontSize: "clamp(16px, 2.5vw, 18px)" }} />
                  <span style={{ fontWeight: "600" }}>About Us</span>
                </Space>
              </Link>
            </Menu.Item>

            {isLoggedIn && (
              <>
                <Menu.Item
                  key="profile"
                  onClick={closeMobileMenu}
                  style={{
                    margin: "4px 16px",
                    borderRadius: "12px",
                    height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to="/profile"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      color: "#1a202c",
                      textDecoration: "none",
                    }}
                  >
                    <Space>
                      <UserOutlined style={{ fontSize: "clamp(16px, 2.5vw, 18px)" }} />
                      <span style={{ fontWeight: "600" }}>My Profile</span>
                    </Space>
                  </Link>
                </Menu.Item>

                <Menu.Item
                  key="orders"
                  onClick={closeMobileMenu}
                  style={{
                    margin: "4px 16px",
                    borderRadius: "12px",
                    height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to="/orders"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      color: "#1a202c",
                      textDecoration: "none",
                    }}
                  >
                    <Space>
                      <ShoppingOutlined style={{ fontSize: "clamp(16px, 2.5vw, 18px)" }} />
                      <span style={{ fontWeight: "600" }}>My Orders</span>
                    </Space>
                  </Link>
                </Menu.Item>

                <Menu.Divider style={{ margin: "16px 0" }} />

                <Menu.Item
                  key="logout"
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  style={{
                    margin: "4px 16px",
                    borderRadius: "12px",
                    height: "clamp(44px, 7vw, 48px)", // Responsive menu item height
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Space style={{ color: "#ef4444", fontWeight: "600" }}>
                    <LogoutOutlined style={{ fontSize: "clamp(16px, 2.5vw, 18px)" }} />
                    <span>Logout</span>
                  </Space>
                </Menu.Item>
              </>
            )}
          </Menu>
        </div>
      </Drawer>

      {/* Custom User Menu Offcanvas */}
      <div
        className={`user-menu-overlay ${userMenuVisible ? "visible" : ""}`}
        onClick={closeUserMenu}
      ></div>
      <div className={`user-menu ${userMenuVisible ? "visible" : ""}`}>
        <div className="user-menu-header">
          <h3>User Menu</h3>
          <button className="user-menu-close" onClick={closeUserMenu}>
            ×
          </button>
        </div>

        {isLoggedIn ? (
          <>
            <div className="user-menu-profile">
              <Avatar
                size={64}
                src={userData?.avatar_url}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: userData?.avatar_url
                    ? "transparent"
                    : "#1677ff",
                }}
              />
              <h3>
                {userData
                  ? `${userData.first_name} ${userData.last_name}`.trim() ||
                    userData.username
                  : "User"}
              </h3>
              <p style={{ color: "#666" }}>{userData?.email || ""}</p>
            </div>

            <ul className="user-menu-items">
              {/* Account Section */}
              <li className="user-menu-section-title">My Account</li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/profile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <UserOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>Profile</span>
                </Link>
              </li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/orders"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <ShoppingOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>View My Orders</span>
                </Link>
              </li>

              {/* Shopping Section */}
              <li className="user-menu-divider"></li>
              <li className="user-menu-section-title">Shopping</li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/cart"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <ShoppingCartOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>My Cart</span>
                  {cartCount > 0 && (
                    <Badge
                      count={cartCount}
                      size="small"
                      style={{ marginLeft: "8px" }}
                    />
                  )}
                </Link>
              </li>

              {/* Other Section */}
              <li className="user-menu-divider"></li>
              <li className="user-menu-section-title">More</li>
              {isAdmin && (
                <li className="user-menu-item" onClick={closeUserMenu}>
                  <Link
                    to="/admin"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <SettingOutlined
                      style={{ marginRight: "10px", fontSize: "18px" }}
                    />
                    <span style={{ fontWeight: "500" }}>Admin Panel</span>
                  </Link>
                </li>
              )}
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/about"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <InfoCircleOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>About Us</span>
                </Link>
              </li>
              <li className="user-menu-divider"></li>
              <li
                className="user-menu-item danger"
                onClick={() => {
                  handleLogout();
                  closeUserMenu();
                }}
                style={{ marginTop: "10px" }}
              >
                <LogoutOutlined
                  style={{ marginRight: "10px", fontSize: "18px" }}
                />
                <span style={{ fontWeight: "500" }}>Logout</span>
              </li>
            </ul>
          </>
        ) : (
          <>
            <ul className="user-menu-items">
              {/* Account Section */}
              <li className="user-menu-section-title">My Account</li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <UserOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>Profile</span>
                </Link>
              </li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/login"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <ShoppingOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>View My Orders</span>
                </Link>
              </li>

              {/* Shopping Section */}
              <li className="user-menu-divider"></li>
              <li className="user-menu-section-title">Shopping</li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/cart"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <ShoppingCartOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>My Cart</span>
                  {cartCount > 0 && (
                    <Badge
                      count={cartCount}
                      size="small"
                      style={{ marginLeft: "8px" }}
                    />
                  )}
                </Link>
              </li>

              {/* Other Section */}
              <li className="user-menu-divider"></li>
              <li className="user-menu-section-title">More</li>
              <li className="user-menu-item" onClick={closeUserMenu}>
                <Link
                  to="/about"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <InfoCircleOutlined
                    style={{ marginRight: "10px", fontSize: "18px" }}
                  />
                  <span style={{ fontWeight: "500" }}>About Us</span>
                </Link>
              </li>
              <li className="user-menu-divider"></li>
              <li
                className="user-menu-item"
                onClick={() => {
                  navigate("/login");
                  closeUserMenu();
                }}
                style={{ marginTop: "10px" }}
              >
                <LogoutOutlined
                  style={{
                    marginRight: "10px",
                    fontSize: "18px",
                  }}
                />
                <span style={{ fontWeight: "500" }}>Logout</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </>
  );
};

export default Header;
