import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: JSX.Element;
  allowedRole: "CUSTOMER" | "KITCHEN";
}

const ProtectedRoute = ({ children, allowedRole }: Props) => {
  const { user, loading } = useAuth();

  // Wait for auth to resolve before making any routing decision
  if (loading) return null;

  // Not logged in — send to login
  if (!user) return <Navigate to="/auth?mode=login" replace />;

  const userRole = user.role?.toUpperCase().trim();

  // Wrong role — redirect to their correct dashboard, not the landing page
  if (userRole !== allowedRole.toUpperCase().trim()) {
    if (userRole === "CUSTOMER") return <Navigate to="/customer-dashboard/overview" replace />;
    if (userRole === "KITCHEN")  return <Navigate to="/kitchen-dashboard" replace />;
    return <Navigate to="/auth?mode=login" replace />;
  }

  return children;
};

export default ProtectedRoute;