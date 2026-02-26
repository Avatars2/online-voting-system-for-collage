import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ element, requiredRoles = [] }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles.length > 0 && role && !requiredRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return element;
}
