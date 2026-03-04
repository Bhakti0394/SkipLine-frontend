import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: JSX.Element;
  allowedRole: "CUSTOMER" | "KITCHEN";
}

const ProtectedRoute = ({ children, allowedRole }: Props) => {
  const { user, loading } = useAuth();

  // ✅ Wait for auth to resolve before making any routing decision
  if (loading) return null;

  if (!user) return <Navigate to="/auth?mode=login" replace />;
  if (user.role?.toUpperCase().trim() !== allowedRole.toUpperCase().trim()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;