import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message, Spin } from "antd";
import { UserOutlined, LockOutlined, ShieldOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });
      if (!response.ok) throw new Error("Invalid credentials");
      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      const me = await fetch("http://localhost:8000/api/auth/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      if (!me.ok) throw new Error("Failed to fetch user");
      const userData = await me.json();
      const adminCheck = await fetch(
        "http://localhost:8000/api/auth/check_admin/",
        { headers: { Authorization: `Bearer ${data.access}` } }
      );
      const adminData = adminCheck.ok
        ? await adminCheck.json()
        : { is_admin: false };
      if (!adminData.is_admin)
        throw new Error("You do not have admin privileges");
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("isAdmin", "true");
      message.success("Admin login successful!");
      navigate("/admin");
    } catch (e) {
      message.error(e.message || "Login failed");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <ShieldOutlined style={{ fontSize: 48, color: "#1890ff" }} />
          <Title level={2} style={{ marginTop: 16 }}>
            Admin Login
          </Title>
          <Text type="secondary">Enter credentials to access admin panel</Text>
        </div>
        <Form name="admin_login" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please input your Username!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: "100%", height: 40 }}
              disabled={loading}
            >
              {loading ? <Spin size="small" /> : "Login"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
