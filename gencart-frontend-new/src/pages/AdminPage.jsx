import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import {
  Layout,
  Menu,
  Typography,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Spin,
  message,
  Tabs,
  Select,
  Divider,
} from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TagOutlined,
  LogoutOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import AdminProducts from "../components/admin/AdminProducts";
import AdminOrders from "../components/admin/AdminOrders";
import AdminUsers from "../components/admin/AdminUsers";
import AdminCategories from "../components/admin/AdminCategories";
import { Column } from "@ant-design/plots";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminPage = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    recentOrders: [],
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [sentimentTrends, setSentimentTrends] = useState(null);
  const [sentimentAlerts, setSentimentAlerts] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [mode, setMode] = useState("global"); // 'global' | 'product'
  const [sentimentStats, setSentimentStats] = useState(null);
  // Chart UX controls (apply to Global only)
  const [chartMode, setChartMode] = useState("percent"); // 'percent' | 'counts'
  const [minDailyTotal, setMinDailyTotal] = useState(0); // hide days with total reviews less than this

  // Fetch sentiment data first (needed by fetchDashboardStats)
  const loadSentimentData = useCallback(
    async (productId = selectedProductId, targetMode = mode) => {
      // Use the simplified, unauthenticated endpoints. Try port 8001, then 8000.
      const buildUrl = (port, path) => `http://localhost:${port}${path}`;
      const ports = [8001, 8000];
      const productQuery =
        targetMode === "product" && productId ? `?product_id=${productId}` : "";
      const statsPaths = ports.map((p) =>
        buildUrl(p, `/api/sentiment/statistics/${productQuery}`)
      );
      const trendsPaths = ports.map((p) =>
        buildUrl(
          p,
          `/api/sentiment/trends/?days=30&mode=analyzed${
            productQuery ? `&product_id=${productId}` : ""
          }`
        )
      );

      const tryFetchJson = async (urls) => {
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (r.ok) return await r.json();
          } catch {
            // try next
          }
        }
        throw new Error(`All endpoints failed: ${urls.join(", ")}`);
      };

      try {
        // 1) Fetch statistics for summary cards
        const statsJson = await tryFetchJson(statsPaths);
        if (statsJson && statsJson.success) {
          const counts = statsJson.sentiment_counts || {
            positive: 0,
            neutral: 0,
            negative: 0,
          };
          const analyzed = statsJson.analyzed_reviews || 0;
          const total = analyzed > 0 ? analyzed : statsJson.total_reviews || 0;
          const pct = (v) =>
            total > 0 ? ((v / total) * 100).toFixed(1) : "0.0";
          setSentimentStats({
            counts,
            percents: {
              positive: pct(counts.positive || 0),
              neutral: pct(counts.neutral || 0),
              negative: pct(counts.negative || 0),
            },
            analyzed,
            total_reviews: statsJson.total_reviews || 0,
            unanalyzed_reviews: statsJson.unanalyzed_reviews || 0,
          });
        }

        // 2) Fetch trends for the 30-day distribution chart (kept as before)
        const trendsJson = await tryFetchJson(trendsPaths);
        if (trendsJson && trendsJson.success) {
          setSentimentTrends(trendsJson.data || null);
        }

        // 3) Alerts (optional) - use port fallback same as above
        try {
          const alertUrls = ports.map((p) =>
            buildUrl(p, "/api/products/sentiment_alerts/?negative_percent=40")
          );
          const a = await tryFetchJson(alertUrls);
          setSentimentAlerts(a.alerts || []);
        } catch {
          // best-effort only
        }
      } catch (err) {
        console.warn("Sentiment load failed", err);
      }
    },
    [selectedProductId, mode]
  );

  // Fetch dashboard statistics
  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const prodRes = await fetch(
        "http://localhost:8000/api/products/?no_pagination=true"
      );
      let products = [];
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        products = prodData.results || prodData || [];
        setProductsList(products);
      }
      let users = [];
      let orders = [];
      if (token) {
        const [userRes, orderRes] = await Promise.all([
          fetch("http://localhost:8000/api/users/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:8000/api/orders/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          users = userData.results || userData || [];
        }
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          orders = orderData.results || orderData || [];
        }
      }
      const totalRevenue = orders.reduce(
        (s, o) => s + parseFloat(o.total_amount || 0),
        0
      );
      setStats((s) => ({
        ...s,
        totalOrders: orders.length,
        totalUsers: users.length,
        totalProducts: products.length,
        totalRevenue,
        recentOrders: orders.slice(0, 5),
      }));
      try {
        const gRes = await fetch(
          "http://localhost:8000/api/products/sentiment_overview/"
        );
        if (gRes.ok) {
          await gRes.json();
        }
      } catch (err) {
        console.warn("Global sentiment fetch failed", err);
      }
      let withReviews = products.find((p) => (p.total_reviews || 0) > 0);
      if (withReviews) setSelectedProductId(withReviews.id);
      await loadSentimentData(withReviews ? withReviews.id : null, "global");
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      message.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }, [loadSentimentData]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        console.log(
          "Checking admin status with token:",
          token ? "Token exists" : "No token"
        );

        if (!token) {
          message.error("You must be logged in to access the admin page");
          navigate("/login?redirect=admin");
          return;
        }

        // First check user data from localStorage
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            console.log("User data from localStorage:", userData);

            // Special case for username 'nvj' - your admin username
            if (userData.username === "nvj") {
              console.log("User is nvj, granting admin access");
              setIsAdmin(true);
              fetchDashboardStats();
              return;
            }

            if (userData.is_staff || userData.is_superuser) {
              console.log("User is admin according to localStorage");
              setIsAdmin(true);
              fetchDashboardStats();
              return;
            }
          } catch (e) {
            console.error("Error parsing user data from localStorage:", e);
          }
        }

        // Now check with the backend
        console.log("Making request to check_admin endpoint...");
        const response = await fetch(
          "http://localhost:8000/api/users/check_admin/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Admin check response status:", response.status);

        if (!response.ok) {
          throw new Error("Failed to verify admin status");
        }

        const data = await response.json();
        console.log("Admin check response data:", data);

        if (!data.is_admin) {
          message.error("You do not have permission to access the admin page");
          navigate("/");
          return;
        }

        console.log("Admin status confirmed, setting isAdmin to true");
        setIsAdmin(true);
        fetchDashboardStats();
      } catch (error) {
        console.error("Error checking admin status:", error);
        message.error("You do not have permission to access the admin page");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate, fetchDashboardStats]);

  const handleModeChange = async (value) => {
    setMode(value);
    // reload sentiment data for new mode
    await loadSentimentData(undefined, value);
    // if switching to product and a product already selected, load product-specific data
    if (value === "product" && selectedProductId) {
      await loadSentimentData(selectedProductId, "product");
    }
  };

  const handleProductChange = async (value) => {
    setSelectedProductId(value);
    if (mode === "product") await loadSentimentData(value, "product");
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    message.success("Logged out successfully");
    navigate("/login");
  };

  // Render dashboard content
  const renderDashboard = () => (
    <div>
      <Title level={2}>Dashboard</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats.totalProducts}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix="₫"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Orders" style={{ marginTop: 16 }}>
        <Table
          dataSource={stats.recentOrders}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          columns={[
            {
              title: "Order ID",
              dataIndex: "id",
              key: "id",
            },
            {
              title: "Customer",
              key: "customer",
              render: (_, record) => {
                console.log("Order record in AdminPage dashboard:", record);
                if (record.user && record.user.username) {
                  return `@${record.user.username}`;
                } else if (record.user_id) {
                  return `User ${record.user_id}`;
                } else {
                  return "Guest";
                }
              },
            },
            {
              title: "Date",
              dataIndex: "created_at",
              key: "created_at",
              render: (text) => new Date(text).toLocaleDateString("en-IN"),
            },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (status) => {
                let color = "default";
                if (status === "processing") color = "blue";
                if (status === "shipped") color = "cyan";
                if (status === "delivered") color = "green";
                if (status === "cancelled") color = "red";

                return <Tag color={color}>{status.toUpperCase()}</Tag>;
              },
            },
            {
              title: "Total",
              dataIndex: "total_amount",
              key: "total_amount",
              render: (text) => `₫${parseFloat(text).toFixed(2)}`,
            },
          ]}
        />
      </Card>
      <Divider orientation="left" style={{ marginTop: 32 }}>
        Sentiment Analytics
      </Divider>

      {/* Sentiment Summary Cards - use accurate counts from statistics endpoint */}
      {sentimentStats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { key: "positive", title: "Positive", color: "#52c41a" },
            { key: "neutral", title: "Neutral", color: "#faad14" },
            { key: "negative", title: "Negative", color: "#ff4d4f" },
          ].map((item) => (
            <Col span={8} key={item.key}>
              <Card size="small">
                <Statistic
                  title={
                    <span style={{ color: item.color }}>{item.title}</span>
                  }
                  value={sentimentStats.counts[item.key] || 0}
                  suffix={
                    <span style={{ fontSize: "14px", color: "#999" }}>
                      ({sentimentStats.percents[item.key]}%)
                    </span>
                  }
                  valueStyle={{ color: item.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={mode}
          onChange={handleModeChange}
          options={[
            { value: "global", label: "Global" },
            { value: "product", label: "Per Product" },
          ]}
          style={{ width: 160 }}
        />
        {mode === "global" && (
          <>
            <Select
              value={chartMode}
              onChange={setChartMode}
              options={[
                { value: "percent", label: "Show % per day" },
                { value: "counts", label: "Show counts per day" },
              ]}
              style={{ width: 200 }}
            />
            <Select
              value={String(minDailyTotal)}
              onChange={(v) => setMinDailyTotal(Number(v))}
              options={[
                { value: "0", label: "Include all days" },
                { value: "1", label: "Hide days < 1 review" },
                { value: "3", label: "Hide days < 3 reviews" },
                { value: "5", label: "Hide days < 5 reviews" },
              ]}
              style={{ width: 220 }}
            />
          </>
        )}
        {mode === "product" && (
          <Select
            placeholder="Select product"
            value={selectedProductId}
            onChange={handleProductChange}
            style={{ minWidth: 260 }}
            showSearch
            optionFilterProp="label"
            options={productsList.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.total_reviews || 0})`,
            }))}
          />
        )}
      </Space>
      {sentimentTrends &&
        sentimentTrends.dates &&
        sentimentTrends.dates.length > 0 && (
          <Card
            title={`Sentiment Distribution (30 days) - ${
              mode === "product" ? "Product" : "Global"
            }`}
            style={{ marginTop: 24 }}
          >
            {(() => {
              const dates = sentimentTrends.dates;
              const data = dates.flatMap((date, idx) => {
                const positive_count = Number(
                  sentimentTrends.positive?.[idx] || 0
                );
                const neutral_count = Number(
                  sentimentTrends.neutral?.[idx] || 0
                );
                const negative_count = Number(
                  sentimentTrends.negative?.[idx] || 0
                );
                const total = positive_count + neutral_count + negative_count;
                // Apply Global-only filter for low-volume days
                const displayMin = mode === "product" ? 0 : minDailyTotal;
                if (total < displayMin) return [];
                const displayMode = mode === "product" ? "percent" : chartMode;

                const mk = (sent, count) => {
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return {
                    date,
                    sentiment: sent,
                    value: displayMode === "percent" ? percent : count,
                    count,
                    total: total || 0,
                    percentage: percent.toFixed(1),
                  };
                };
                return [
                  mk("positive", positive_count),
                  mk("neutral", neutral_count),
                  mk("negative", negative_count),
                ];
              });

              console.log("Chart data:", data); // Debug log

              const displayMode = mode === "product" ? "percent" : chartMode;
              return (
                <Column
                  data={data}
                  xField="date"
                  yField="value"
                  seriesField="sentiment"
                  isStack
                  // Fix series order and colors to avoid misinterpretation
                  meta={{
                    sentiment: { values: ["positive", "neutral", "negative"] },
                  }}
                  color={(datum) =>
                    ({
                      positive: "#52c41a",
                      neutral: "#faad14",
                      negative: "#ff4d4f",
                    }[datum.sentiment] || "#d9d9d9")
                  }
                  height={320}
                  yAxis={
                    displayMode === "percent"
                      ? { max: 100, label: { formatter: (v) => `${v}%` } }
                      : { label: { formatter: (v) => `${v}` } }
                  }
                  legend={{ position: "top" }}
                  columnStyle={{ radius: [2, 2, 0, 0] }}
                  tooltip={{
                    title: "date",
                    customContent: (title, items) => {
                      if (!items || items.length === 0) return null;
                      const order = { positive: 0, neutral: 1, negative: 2 };
                      const sorted = [...items].sort(
                        (a, b) =>
                          (order[a?.data?.sentiment] ?? 99) -
                          (order[b?.data?.sentiment] ?? 99)
                      );
                      let content = `<div style="padding: 8px;"><strong>${title}</strong><br/>`;
                      sorted.forEach((item) => {
                        const rawData = item.data;
                        const sentiment = rawData?.sentiment || "unknown";
                        const count = rawData?.count || 0;
                        const percentage = rawData?.percentage || "0.0";
                        const line =
                          displayMode === "percent"
                            ? `${percentage}% (${count} reviews)`
                            : `${count} reviews (${percentage}%)`;
                        content += `<div style="margin: 4px 0;"><span style="color: ${item.color};">●</span> ${sentiment}: ${line}</div>`;
                      });
                      content += "</div>";
                      return content;
                    },
                  }}
                />
              );
            })()}
          </Card>
        )}
      <Card title="Negative Sentiment Alerts" style={{ marginTop: 24 }}>
        {sentimentAlerts.length === 0 ? (
          <p style={{ margin: 0, color: "#999" }}>
            No products exceed threshold.
          </p>
        ) : (
          <Table
            size="small"
            pagination={false}
            dataSource={sentimentAlerts.map((a) => ({
              key: a.product_id,
              ...a,
            }))}
            columns={[
              { title: "Product", dataIndex: "name" },
              {
                title: "Negative %",
                dataIndex: "negative_percent",
                render: (v) => v.toFixed(1) + "%",
              },
              { title: "Reviews", dataIndex: "total_reviews" },
            ]}
          />
        )}
        {/* Optional note: backend may return top products if no item crosses threshold */}
        <div style={{ marginTop: 8, color: "#999", fontSize: 12 }}>
          Showing products exceeding threshold, or top negatives when none
          exceed.
        </div>
      </Card>
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "products":
        return <AdminProducts />;
      case "orders":
        return <AdminOrders />;
      case "users":
        return <AdminUsers />;
      case "categories":
        return <AdminCategories />;
      default:
        return renderDashboard();
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Refresh sentiment when global overview refetched (only if in global mode)
  useEffect(() => {
    if (mode === "global") loadSentimentData(null, "global");
  }, [mode, loadSentimentData]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
        }}
      >
        <div
          style={{
            height: 32,
            margin: 16,
            background: "rgba(255, 255, 255, 0.2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text strong style={{ color: "white" }}>
            GenCart Admin
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => {
            if (key === "logout") {
              handleLogout();
            } else {
              setActiveTab(key);
            }
          }}
          items={[
            {
              key: "home",
              icon: <HomeOutlined />,
              label: "Home",
              onClick: () => navigate("/"),
            },
            {
              key: "dashboard",
              icon: <DashboardOutlined />,
              label: "Dashboard",
            },
            {
              key: "products",
              icon: <AppstoreOutlined />,
              label: "Products",
            },
            {
              key: "orders",
              icon: <ShoppingOutlined />,
              label: "Orders",
            },
            {
              key: "users",
              icon: <UserOutlined />,
              label: "Users",
            },
            {
              key: "categories",
              icon: <TagOutlined />,
              label: "Categories",
            },

            {
              key: "logout",
              icon: <LogoutOutlined />,
              label: "Logout",
            },
          ]}
        />
      </Sider>
      <Layout
        style={{ marginLeft: collapsed ? 80 : 200, transition: "all 0.2s" }}
      >
        <Header style={{ padding: 0, background: "#fff" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <Title level={4} style={{ marginTop: 10 }}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </Title>
              <Button
                type="primary"
                icon={<HomeOutlined />}
                onClick={() => navigate("/")}
                style={{ marginLeft: 16, marginTop: 10 }}
              >
                Home
              </Button>
            </div>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            background: "#fff",
            minHeight: 280,
          }}
        >
          <Routes>
            <Route path="/" element={renderContent()} />
            <Route path="/dashboard" element={renderContent()} />
            <Route path="*" element={renderContent()} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminPage;
