import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Tag,
  Spin,
  Alert,
} from "antd";
import {
  ShoppingOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SentimentAnalyticsSimple from "../../components/SentimentAnalyticsSimple";

const { Title } = Typography;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const productsRes = await fetch(
          "http://localhost:8000/api/products/?no_pagination=true"
        );
        if (productsRes.status === 401) {
          console.warn("Products 401 - should be public now");
        }
        const productsData = productsRes.ok
          ? await productsRes.json()
          : { results: [], count: 0 };

        // Protected resources only if token present
        let usersData = { count: 0 };
        let ordersData = { results: [], count: 0 };
        if (token) {
          const [usersRes, ordersRes] = await Promise.all([
            fetch("http://localhost:8000/api/users/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("http://localhost:8000/api/orders/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (usersRes.ok) usersData = await usersRes.json();
          if (ordersRes.ok) ordersData = await ordersRes.json();
        }

        const totalRevenue = ordersData.results.reduce(
          (sum, order) => sum + parseFloat(order.total_amount || 0),
          0
        );

        setStats({
          totalProducts:
            productsData.count || productsData.results?.length || 0,
          totalUsers: usersData.count || 0,
          totalOrders: ordersData.count || 0,
          totalRevenue,
        });

        const recentOrdersData = ordersData.results.slice(0, 5);
        setRecentOrders(recentOrdersData);

        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [navigate]);

  const orderColumns = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Customer",
      key: "user",
      render: (_, record) => {
        console.log("Order record:", record); // Debug log
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
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "blue";
        if (status === "delivered") color = "green";
        if (status === "cancelled") color = "red";
        if (status === "processing") color = "orange";
        if (status === "shipped") color = "cyan";
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Total (VND)",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => `₫${parseFloat(amount).toFixed(2)}`,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={`Failed to load dashboard data: ${error}`}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ paddingTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 10 }}>
          Dashboard
        </Title>
        {/* Right-side actions (optional): e.g., filters or refresh button */}
        <div />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats.totalProducts}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue (VND)"
              value={stats.totalRevenue}
              precision={2}
              prefix={
                <>
                  <CreditCardOutlined style={{ marginRight: 4 }} />
                  <span>₫</span>
                </>
              }
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Title level={4}>Recent Orders</Title>
        <Table
          columns={orderColumns}
          dataSource={recentOrders.map((order) => ({
            ...order,
            key: order.id,
          }))}
          pagination={false}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <SentimentAnalyticsSimple />
      </div>
    </div>
  );
};

export default AdminDashboard;
