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
  const { loading }     = useAuth();
  const [showLoader, setShowLoader] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => {
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);

  const handleLoaderComplete = () => {
    if (!loading) {
      setShowLoader(false);
    } else {
      intervalRef.current = setInterval(() => {
  if (!loading) {
    clearInterval(intervalRef.current!);
    intervalRef.current = null;
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

        {/*
          FIX [SKIPLINE-SCOPE]: SkipLineProvider moved inside the CUSTOMER
          route only, not at root level.

          BEFORE: SkipLineProvider wrapped the entire app at the root level.
          This meant kitchen admins (KITCHEN role) also had SkipLineProvider
          mounted, which immediately called:
            - fetchCustomerOrders()      → 403 (KITCHEN token, CUSTOMER endpoint)
            - fetchCustomerMetrics()     → 403
            - fetchCustomerStreak()      → 403
          All three failed silently (caught and logged as warnings), but they
          generated 3× noisy 403s in server logs on every kitchen page load
          and ran unnecessary network requests.

          AFTER: SkipLineProvider only mounts when the user navigates to
          /customer-dashboard/*. Kitchen admins never trigger any customer
          API calls.

          Note: ProtectedRoute checks role before rendering children, so
          SkipLineProvider will only ever initialize for CUSTOMER role users.
        */}
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
          {/* SkipLineProvider removed from here — now inside /customer-dashboard/* route */}
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