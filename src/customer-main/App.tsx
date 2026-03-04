import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import BrowseMenu from "../pages/CustomerDashboard/BrowseMenu";
import MyOrders from "../pages/CustomerDashboard/MyOrders";
import OrderHistory from "../pages/CustomerDashboard/OrderHistory";
import Favorites from "../pages/CustomerDashboard/Favorites";
import Profile from "../pages/CustomerDashboard/Profile";
import Settings from "../pages/CustomerDashboard/Settings";
import Checkout from "../pages/CustomerDashboard/Checkout";
import OrderSuccess from "../pages/CustomerDashboard/OrderSuccess";
import NotFound from "../pages/CustomerDashboard/NotFound";
import { NotificationProvider } from "../../src/customer-context/NotificationContext";
import Overview from "../pages/CustomerDashboard/Index";

const CustomerApp = () => {
  return (
    <NotificationProvider>
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="browse" element={<BrowseMenu />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="history" element={<OrderHistory />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-success" element={<OrderSuccess />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </NotificationProvider>
  );
};

export default CustomerApp;