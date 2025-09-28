import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout, ConfigProvider } from "antd";
import "./App.css";

// Pages
import HomePage from "./pages/HomePage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";

// Context
import { CartProvider } from "./context/CartContext";

// Components
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Sidebar from "./components/layout/Sidebar";

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
        },
      }}
    >
      <CartProvider>
        <Router>
          <Routes>
            {/* Admin route with its own layout */}
            <Route path="/admin/*" element={<AdminPage />} />

            {/* Regular routes with standard layout */}
            <Route
              path="/*"
              element={
                <Layout className="layout">
                  <Header />
                  <Layout hasSider>
                    <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
                    <Layout style={{ 
                       marginLeft: collapsed ? 0 : 280,
                       transition: 'margin-left 0.3s ease'
                     }}>
                      <Content
                        className="site-layout-content"
                        style={{
                          padding: "24px",
                          margin: 0,
                          minHeight: "calc(100vh - 72px)",
                          background:
                            "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                        }}
                      >
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route
                            path="/products"
                            element={<ProductListPage />}
                          />
                          <Route
                            path="/products/:id"
                            element={<ProductDetailPage />}
                          />
                          <Route path="/cart" element={<CartPage />} />
                          <Route path="/checkout" element={<CheckoutPage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="/orders" element={<OrdersPage />} />
                          <Route
                            path="/orders/:id"
                            element={<OrderDetailsPage />}
                          />
                          <Route path="/about" element={<AboutPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Content>
                      <Footer />
                    </Layout>
                  </Layout>
                </Layout>
              }
            />
          </Routes>
        </Router>
      </CartProvider>
    </ConfigProvider>
  );
}

export default App;
