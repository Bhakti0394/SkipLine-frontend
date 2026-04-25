import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: JSX.Element;
  allowedRole: "CUSTOMER" | "KITCHEN";
}

const ProtectedRoute = ({ children, allowedRole }: Props) => {
  const { user, loading } = useAuth();

  // Wait for auth to resolve before making any routing decision
 if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'hsl(var(--background))',
    }}>
      <div style={{
        width: '2rem', height: '2rem',
        border: '3px solid hsl(var(--secondary))',
        borderTopColor: 'hsl(var(--primary))',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Not logged in — send to login
  if (!user) return <Navigate to="/auth?mode=login" replace />;

const userRole = user.role?.toUpperCase().trim();

  if (!userRole) {
    console.warn('[ProtectedRoute] user.role is missing or null — forcing re-login', user);
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (userRole !== allowedRole.toUpperCase().trim()) {
    console.warn(`[ProtectedRoute] Role mismatch: expected ${allowedRole}, got ${userRole}`);
    if (userRole === "CUSTOMER") return <Navigate to="/customer-dashboard/overview" replace />;
    if (userRole === "KITCHEN")  return <Navigate to="/kitchen-dashboard" replace />;
    return <Navigate to="/auth?mode=login" replace />;
  }

  return children;
};

export default ProtectedRoute;

