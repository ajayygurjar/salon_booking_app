import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false, userOnly = false }) {
    const { user, isAdmin } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
    if (userOnly && isAdmin) return <Navigate to="/admin" replace />;

    return children;
}