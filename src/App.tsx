import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider }    from "@/context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster }         from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SkipLineProvider } from "./customer-context/SkipLineContext";

import Index    from "./pages/Index";
import Auth     from "./pages/Auth";
import NotFound from "./pages/NotFound";

import CustomerApp      from "./customer-main/App";
import KitchenDashboard from "./kitchen-main/App";

import ProtectedRoute from "./routes/ProtectedRoute";
import { PageLoader } from "./components/Pageloader";
import { useAuth }    from "@/context/AuthContext";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef  = useRef(loading);
  const mountedRef  = useRef(true);

  // Keep loadingRef current so interval callback never reads stale closure
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleLoaderComplete = () => {
    if (!loadingRef.current) {
      setShowLoader(false);
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!loadingRef.current) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        if (mountedRef.current) setShowLoader(false);
      }
    }, 100);
  };

  return (
    <>
      {showLoader && (
        <PageLoader onComplete={handleLoaderComplete} minDuration={3200} />
      )}
      <div style={{ visibility: showLoader ? 'hidden' : 'visible' }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/customer-dashboard/*"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <SkipLineProvider>
                  <CustomerApp />
                </SkipLineProvider>
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
      </div>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition:   true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;