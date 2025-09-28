import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminUsers from './admin/AdminUsers';
import AdminCategories from './admin/AdminCategories';
import LoginCheck from './admin/LoginCheck';

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/products" element={<AdminProducts />} />
      <Route path="/orders" element={<AdminOrders />} />
      <Route path="/users" element={<AdminUsers />} />
      <Route path="/categories" element={<AdminCategories />} />
      <Route path="/login-check" element={<LoginCheck />} />
    </Routes>
  );
};

export default AdminRoutes;
