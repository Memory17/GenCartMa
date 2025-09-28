import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  Typography,
  Avatar,
  Dropdown,
  message,
} from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
  TagOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in and is admin
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const userDataStr = localStorage.getItem("user");

    if (!isLoggedIn || !isAdmin) {
      message.error("You must be logged in as an admin to access this page");
      navigate("/admin/login");
      return;
    }

    if (userDataStr) {
      try {
        const parsedUserData = JSON.parse(userDataStr);
        setUserData(parsedUserData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("user");
    message.success("Logged out successfully");
    navigate("/admin/login");
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Profile
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  // Get the current selected key based on the path
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/admin/dashboard")) return "1";
    if (path.includes("/admin/products")) return "2";
    if (path.includes("/admin/categories")) return "3";
    if (path.includes("/admin/orders")) return "4";
    if (path.includes("/admin/users")) return "5";
    if (path.includes("/admin/payments")) return "6";
    return "1";
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
        <div
          style={{
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0" : "0 16px",
            color: "white",
            backgroundColor: "#001529",
          }}
        >
          {!collapsed && (
            <Title level={4} style={{ margin: 0, color: "white" }}>
              GenCart Admin
            </Title>
          )}
          {collapsed && <ShoppingOutlined style={{ fontSize: "24px" }} />}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[getSelectedKey()]}
          selectedKeys={[getSelectedKey()]}
          items={[
            {
              key: "home",
              icon: <HomeOutlined />,
              label: <Link to="/">Home</Link>,
            },
            {
              key: "1",
              icon: <DashboardOutlined />,
              label: <Link to="/admin/dashboard">Dashboard</Link>,
            },
            {
              key: "2",
              icon: <ShoppingOutlined />,
              label: <Link to="/admin/products">Products</Link>,
            },
            {
              key: "3",
              icon: <TagOutlined />,
              label: <Link to="/admin/categories">Categories</Link>,
            },
            {
              key: "4",
              icon: <ShoppingCartOutlined />,
              label: <Link to="/admin/orders">Orders</Link>,
            },
            {
              key: "5",
              icon: <UserOutlined />,
              label: <Link to="/admin/users">Users</Link>,
            },
            {
              key: "6",
              icon: <CreditCardOutlined />,
              label: <Link to="/admin/payments">Payments</Link>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            margin: "0 20px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64 }}
            />
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => navigate("/")}
              style={{ marginLeft: 16, marginTop: 10 }}
            >
              Home
            </Button>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {userData && (
              <Dropdown overlay={userMenu} placement="bottomRight">
                <div
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Avatar
                    style={{ backgroundColor: "#1890ff" }}
                    icon={<UserOutlined />}
                    src={userData.avatar_url}
                  />
                  <Text style={{ marginLeft: 8 }}>{userData.username}</Text>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: "32px 24px 24px",
            background: "#fff",
            minHeight: 280,
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
