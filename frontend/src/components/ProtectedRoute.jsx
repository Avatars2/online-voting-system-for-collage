import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PageStatePersistence } from "../utils/pageStatePersistence.js";

export default function ProtectedRoute({ element, requiredRoles = [] }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Save current page state
  React.useEffect(() => {
    if (token && role) {
      PageStatePersistence.savePageState(location.pathname, {
        role,
        timestamp: Date.now()
      });
    }
  }, [location.pathname, token, role]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles.length > 0 && role && !requiredRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return element;
}
