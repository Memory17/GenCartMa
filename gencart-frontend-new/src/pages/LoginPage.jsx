import React, { useState } from "react";
import {
  Typography,
  Form,
  Input,
  Button,
  Card,
  Checkbox,
  Divider,
  message,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import {
  UserOutlined,
  LockOutlined,
  GoogleOutlined,
  FacebookOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Make a real API call to the Django backend
      const response = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username, // The serializer still expects 'username' field but will use it as email
          password: values.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login error response:", errorData);

        // Format error messages from the API response
        let errorMessage = "Login failed";
        if (typeof errorData === "object") {
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else {
            const messages = [];
            for (const [key, value] of Object.entries(errorData)) {
              if (Array.isArray(value)) {
                messages.push(`${key}: ${value.join(", ")}`);
              } else if (typeof value === "string") {
                messages.push(`${key}: ${value}`);
              }
            }
            if (messages.length > 0) {
              errorMessage = messages.join("; ");
            }
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Store the JWT tokens
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("isLoggedIn", "true");

      // Get user info
      const userResponse = await fetch("http://localhost:8000/api/auth/me/", {
        headers: {
          Authorization: `Bearer ${data.access}`,
        },
      });

      let isAdmin = false;
      let userData = null;

      if (userResponse.ok) {
        userData = await userResponse.json();
        localStorage.setItem("user", JSON.stringify(userData));

        // Check if user is admin (staff or superuser)
        isAdmin = userData.is_staff || userData.is_superuser;
        console.log("User data:", userData);
        console.log("Is admin:", isAdmin);

        // Force redirect to admin page if username is nvj (your admin username)
        if (values.username === "nvj") {
          console.log("Username is nvj, forcing admin redirect");
          message.success("Login successful! Redirecting to admin panel...");
          navigate("/admin");
          return;
        }
      }

      message.success("Login successful!");

      // Explicitly check admin status with the backend
      try {
        const adminCheckResponse = await fetch(
          "http://localhost:8000/api/auth/check_admin/",
          {
            headers: {
              Authorization: `Bearer ${data.access}`,
            },
          }
        );

        if (adminCheckResponse.ok) {
          const adminCheckData = await adminCheckResponse.json();
          console.log("Admin check response:", adminCheckData);

          if (adminCheckData.is_admin) {
            // User is confirmed as admin by the backend
            message.info(
              "You are logged in as an admin. Redirecting to admin panel."
            );
            navigate("/admin");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }

      // If we get here, either the admin check failed or the user is not an admin
      // Fallback to the original logic
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");

      // Check if the user data indicates admin status
      if (userData && (userData.is_staff || userData.is_superuser)) {
        console.log(
          "User is admin according to user data, redirecting to admin page"
        );
        message.info(
          "You are logged in as an admin. Redirecting to admin panel."
        );
        navigate("/admin");
        return;
      }

      if (redirect === "admin" && isAdmin) {
        navigate("/admin");
      } else if (isAdmin) {
        // If user is admin, go to admin page
        message.info(
          "You are logged in as an admin. You can access the admin panel."
        );
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error(
        error.message || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%236366f1" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.5,
        }}
      />

      <Card
        className="auth-form"
        style={{
          background: "white",
          borderRadius: "20px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 20px 60px rgba(71, 85, 105, 0.1)",
          position: "relative",
          zIndex: 1,
        }}
        styles={{
          body: {
            padding: "48px 40px",
          },
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Title
            level={2}
            style={{
              color: "#0f172a",
              marginBottom: 8,
              fontSize: "2rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome Back
          </Title>
          <Text style={{ color: "#64748b", fontSize: "16px" }}>
            Sign in to your account to continue
          </Text>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "Please enter your username" },
              { min: 3, message: "Username must be at least 3 characters" },
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#6366f1" }} />}
              placeholder="Username"
              size="large"
              style={{
                height: 52,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                fontSize: 16,
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#6366f1" }} />}
              placeholder="Password"
              size="large"
              style={{
                height: 52,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                fontSize: 16,
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox
                  style={{
                    color: "#475569",
                    fontSize: 14,
                  }}
                >
                  Remember me
                </Checkbox>
              </Form.Item>
              <Link
                to="/forgot-password"
                style={{
                  color: "#6366f1",
                  fontWeight: 500,
                  fontSize: 14,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              >
                Forgot password?
              </Link>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                height: 56,
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow =
                  "0 12px 32px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.3)";
              }}
            >
              Log in
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Text style={{ color: "#64748b", fontSize: 15 }}>
              Don't have an account?{" "}
            </Text>
            <Link
              to="/register"
              style={{
                color: "#6366f1",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                (e.target.style.textDecoration = "underline")
              }
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
            >
              Register now
            </Link>
          </div>

          <Divider
            style={{
              borderColor: "#e2e8f0",
              marginBottom: 32,
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            or login with
          </Divider>

          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <Button
              icon={<GoogleOutlined />}
              size="large"
              onClick={() =>
                message.info("Google login not implemented in this demo")
              }
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                color: "#475569",
                fontWeight: 500,
                background: "white",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.color = "#6366f1";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.color = "#475569";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Google
            </Button>
            <Button
              icon={<FacebookOutlined />}
              size="large"
              onClick={() =>
                message.info("Facebook login not implemented in this demo")
              }
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                color: "#475569",
                fontWeight: 500,
                background: "white",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.color = "#6366f1";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.color = "#475569";
                e.target.style.transform = "translateY(0)";
              }}
            >
              Facebook
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
