import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider }    from "@/context/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster }         from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SkipLineProvider }      from "./customer-context/SkipLineContext";
import { NotificationProvider }  from "./customer-context/NotificationContext";

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
 const [showLoader, setShowLoader] = useState(false);
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

const handleLoaderComplete = useCallback(() => {
    if (!loadingRef.current) {
      if (mountedRef.current) {
        sessionStorage.setItem('app_loaded', '1');
        setShowLoader(false);
      }
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }
      if (!loadingRef.current) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        sessionStorage.setItem('app_loaded', '1');
        setShowLoader(false);
      }
    }, 100);
  }, []);
  return (
    <>
      {showLoader && (
       <PageLoader onComplete={handleLoaderComplete} minDuration={1500} />
      )}
<div style={{ display: showLoader ? 'none' : 'block' }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

         <Route
            path="/customer-dashboard/*"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <SkipLineProvider>
                  <NotificationProvider>
                    <CustomerApp />
                  </NotificationProvider>
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