import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SkipLineProvider } from "./customer-context/SkipLineContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import CustomerApp from "./customer-main/App";
import KitchenDashboard from "./kitchen-main/App";

import ProtectedRoute from "./routes/ProtectedRoute";
import { PageLoader } from "./components/Pageloader";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);

  const authReady = !loading;

  const handleLoaderComplete = () => {
    if (authReady) {
      setShowLoader(false);
    } else {
      const id = setInterval(() => {
        if (!loading) {
          clearInterval(id);
          setShowLoader(false);
        }
      }, 100);
    }
  };

  return (
    <>
      {showLoader && (
        <PageLoader onComplete={handleLoaderComplete} minDuration={3200} />
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/customer-dashboard/*"
          element={
            <ProtectedRoute allowedRole="CUSTOMER">
              <CustomerApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen-dashboard/*"
          element={
            <ProtectedRoute allowedRole="KITCHEN">
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SkipLineProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </SkipLineProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;