import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Spin, Badge, Button } from "antd";
import { Link } from "react-router-dom";
import {
  AppstoreOutlined,
  LaptopOutlined,
  MobileOutlined,
  HomeOutlined,
  SkinOutlined,
  TagsOutlined,
  FireOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import "./Sidebar.css";

const { Sider } = Layout;
const { Title, Text } = Typography;

const Sidebar = ({ collapsed, setCollapsed }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productCounts, setProductCounts] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:8000/api/categories/");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.results || data);

          // Fetch product counts for each category
          const counts = {};
          for (const category of data.results || data) {
            try {
              const countResponse = await fetch(
                `http://localhost:8000/api/products/?category=${category.id}`
              );
              if (countResponse.ok) {
                const countData = await countResponse.json();
                counts[category.id] = countData.results
                  ? countData.results.length
                  : countData.length;
              }
            } catch (error) {
              console.error(
                `Error fetching count for category ${category.id}:`,
                error
              );
              counts[category.id] = 0;
            }
          }
          setProductCounts(counts);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Fallback to mock data
        setCategories([
          { id: 1, name: "Electronics", icon: <LaptopOutlined /> },
          { id: 2, name: "Clothing", icon: <SkinOutlined /> },
          { id: 3, name: "Home & Kitchen", icon: <HomeOutlined /> },
          { id: 4, name: "Phones & Accessories", icon: <MobileOutlined /> },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      Electronics: <LaptopOutlined />,
      Clothing: <SkinOutlined />,
      "Home & Kitchen": <HomeOutlined />,
      "Phones & Accessories": <MobileOutlined />,
      Fashion: <SkinOutlined />,
      Technology: <LaptopOutlined />,
      Books: <AppstoreOutlined />,
      Sports: <FireOutlined />,
    };

    return iconMap[categoryName] || <TagsOutlined />;
  };

  const categoryItems = categories.map((category) => ({
    key: `category-${category.id}`,
    icon: (
      <div
        style={{
          width: "clamp(24px, 4vw, 28px)", // Responsive icon container
          height: "clamp(24px, 4vw, 28px)",
          borderRadius: "clamp(8px, 1.5vw, 10px)",
          background:
            "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#667eea",
          fontSize: "clamp(14px, 2.2vw, 16px)", // Responsive icon size
          transition: "all 0.3s ease",
        }}
      >
        {getCategoryIcon(category.name)}
      </div>
    ),
    label: (
      <Link
        to={`/products?category=${category.name}`}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0 clamp(6px, 1.5vw, 8px)", // Responsive padding
          fontWeight: "500",
          fontSize: "clamp(13px, 2.2vw, 15px)", // Responsive font size
          transition: "all 0.3s ease",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            color: "#374151",
          }}
        >
          {category.name}
        </span>
        {productCounts[category.id] !== undefined && (
          <Badge
            count={productCounts[category.id]}
            size="small"
            style={{
              backgroundColor: "#667eea",
              boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
              marginLeft: "clamp(8px, 2vw, 12px)", // Responsive margin
              fontSize: "clamp(10px, 1.8vw, 11px)", // Responsive badge text
              fontWeight: "600",
              minWidth: "clamp(18px, 3vw, 20px)", // Responsive badge size
              height: "clamp(18px, 3vw, 20px)",
              lineHeight: "clamp(18px, 3vw, 20px)",
              borderRadius: "clamp(9px, 1.5vw, 10px)",
            }}
          />
        )}
      </Link>
    ),
  }));

  const menuItems = [
    {
      key: "categories",
      icon: (
        <div
          style={{
            width: "clamp(28px, 4.5vw, 32px)", // Responsive main icon container
            height: "clamp(28px, 4.5vw, 32px)",
            borderRadius: "clamp(10px, 2vw, 12px)",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "clamp(14px, 2.5vw, 16px)", // Responsive main icon size
            boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
          }}
        >
          <AppstoreOutlined />
        </div>
      ),
      label: (
        <span
          style={{
            color: "#1a202c",
            fontWeight: "700",
            fontSize: "clamp(14px, 2.5vw, 16px)", // Responsive label
            letterSpacing: "-0.3px",
          }}
        >
          Categories
        </span>
      ),
      children: categoryItems,
    },
  ];

  // Auto-collapse on small screens
  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  }, [isMobile, collapsed, setCollapsed]);

  return (
    <>
      {/* Toggle Button - Responsive */}
      <Button
        type="primary"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "fixed",
          top: "clamp(80px, 12vw, 85px)", // Responsive top position
          left: collapsed ? "clamp(8px, 2vw, 10px)" : "clamp(240px, 35vw, 250px)", // Responsive left position
          zIndex: 1001,
          width: "clamp(36px, 5.5vw, 40px)", // Responsive button size
          height: "clamp(36px, 5.5vw, 40px)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          transition: "all 0.3s ease",
          fontSize: "clamp(14px, 2.2vw, 16px)", // Responsive icon size
        }}
      />
      
      <Sider
        width={`clamp(260px, 35vw, 280px)`} // Responsive sidebar width
        collapsed={collapsed}
        collapsedWidth={0}
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          overflow: "hidden",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: "clamp(64px, 10vw, 72px)", // Responsive top position to match header
          zIndex: 100,
          boxShadow: "4px 0 12px rgba(0, 0, 0, 0.08)",
          borderRight: "1px solid rgba(0, 0, 0, 0.06)",
          transition: "all 0.3s ease",
        }}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) {
            setCollapsed(true);
          }
        }}
        className="custom-sidebar"
      >
        <div
          style={{
            padding: "clamp(20px, 4vw, 28px) clamp(20px, 3.5vw, 24px) clamp(20px, 3.5vw, 24px) clamp(20px, 3.5vw, 24px)", // Responsive padding
            borderBottom: "2px solid rgba(102, 126, 234, 0.1)",
            background:
              "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
              opacity: 0.6,
            }}
          />
          <Title
            level={4}
            style={{
              margin: 0,
              color: "#1a202c",
              fontSize: "clamp(16px, 3vw, 20px)", // Responsive title
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              letterSpacing: "-0.5px",
              lineHeight: "1.2",
            }}
          >
            <div
              style={{
                width: "clamp(32px, 5vw, 36px)", // Responsive title icon container
                height: "clamp(32px, 5vw, 36px)",
                borderRadius: "clamp(10px, 2vw, 12px)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "clamp(12px, 2.5vw, 16px)", // Responsive margin
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              }}
            >
              <AppstoreOutlined
                style={{
                  color: "white",
                  fontSize: "clamp(16px, 2.8vw, 18px)", // Responsive title icon
                }}
              />
            </div>
            Shop By Categories
          </Title>
          <Text
            style={{
              display: "block",
              marginTop: "clamp(4px, 1vw, 6px)", // Responsive margin
              color: "#64748b",
              fontSize: "clamp(11px, 2vw, 13px)", // Responsive subtitle
              fontWeight: "500",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginLeft: "clamp(44px, 7.5vw, 52px)", // Responsive margin to align with icon
            }}
          >
            Browse & Discover Products
          </Text>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "clamp(50px, 8vw, 60px) clamp(20px, 3.5vw, 24px)", // Responsive padding
              background: "rgba(102, 126, 234, 0.02)",
            }}
          >
            <div
              style={{
                width: "clamp(44px, 6vw, 48px)", // Responsive loading container
                height: "clamp(44px, 6vw, 48px)",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto clamp(16px, 3vw, 20px) auto", // Responsive margin
                animation: "pulse 2s infinite",
              }}
            >
              <Spin
                style={{
                  color: "white",
                }}
              />
            </div>
            <Text
              style={{
                display: "block",
                color: "#64748b",
                fontSize: "clamp(13px, 2.2vw, 15px)", // Responsive loading text
                fontWeight: "500",
              }}
            >
              Loading Categories...
            </Text>
          </div>
        ) : (
          <Menu
            mode="inline"
            defaultSelectedKeys={["categories"]}
            defaultOpenKeys={["categories"]}
            style={{
              height: `calc(100vh - clamp(140px, 20vw, 150px))`, // Responsive height calculation
              borderRight: 0,
              overflow: "auto",
              background: "transparent",
              padding: "clamp(12px, 2.5vw, 16px) 0", // Responsive padding
            }}
            items={menuItems}
            className="custom-sidebar-menu"
          />
        )}
      </Sider>
    </>
  );
};

export default Sidebar;
