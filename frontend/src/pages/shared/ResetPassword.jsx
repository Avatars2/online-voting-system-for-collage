import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";
import { validatePassword } from "../../utils/validation";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [errors, setErrors] = useState({});
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [validatingCurrentPassword, setValidatingCurrentPassword] = useState(false);
  const [passwordValidationTimeout, setPasswordValidationTimeout] = useState(null);

  useEffect(() => {
    const currentRole = localStorage.getItem("role");
    const token = localStorage.getItem("token");
    
    if (!token) {
      navigate("/");
      return;
    }
    
    setRole(currentRole);
  }, [navigate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (passwordValidationTimeout) {
        clearTimeout(passwordValidationTimeout);
      }
    };
  }, [passwordValidationTimeout]);

  const validateForm = () => {
    const newErrors = {};

    // Validate current password
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    // Validate new password using same validation as login
    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.errors[0];
    }

    // Validate confirm password
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Check if new password is same as current password
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentPassword = async (password) => {
    // Only check if field is required, no other validation
    if (!password.trim()) {
      setCurrentPasswordError("Current password is required");
      return false;
    }
    
    // Clear error if field has content
    setCurrentPasswordError("");
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
    
    // Real-time validation
    if (name === "currentPassword") {
      if (!value.trim()) {
        setCurrentPasswordError("Current password is required");
      } else {
        setCurrentPasswordError("");
      }
    } else if (name === "newPassword") {
      if (!value.trim()) {
        setNewPasswordError("New password is required");
      } else if (value.length < 6) {
        setNewPasswordError("Password must be at least 6 characters long");
      } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
        setNewPasswordError("Password must contain both letters and numbers");
      } else if (value === formData.currentPassword) {
        setNewPasswordError("New password must be different from current password");
      } else {
        setNewPasswordError("");
        // Check confirm password if it's already filled
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          setConfirmPasswordError("Passwords do not match");
        } else if (formData.confirmPassword && value === formData.confirmPassword) {
          setConfirmPasswordError("");
        }
      }
    } else if (name === "confirmPassword") {
      if (!value.trim()) {
        setConfirmPasswordError("Please confirm your password");
      } else if (value !== formData.newPassword) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setConfirmPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    // Clear all inline errors
    setCurrentPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Create custom axios instance without 401 interceptor for password change
      const customApi = axios.create({
        baseURL: import.meta.env.VITE_API_URL || "/api",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
      });
      
      await customApi.post("/auth/change-password", {
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Show success message
      setSuccessMessage("Password changed successfully!");
      
      // Clear form but keep user on same page
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setErrors({});

    } catch (err) {
      console.error("Password change error:", err);
      // Handle specific old password mismatch error without redirect
      if (err.response?.status === 401 || 
          err.response?.data?.error?.includes('old password') || 
          err.response?.data?.error?.includes('current password') ||
          err.response?.data?.error?.includes('incorrect')) {
        setCurrentPasswordError("Current password does not match");
        setErrors({ currentPassword: "Current password does not match" });
      } else {
        const errorMessage = err.response?.data?.error || "Failed to change password";
        setError(errorMessage);
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getRoleConfig = () => {
    switch (role) {
      case "admin":
        return {
          title: "Change Password",
          subtitle: "Secure your account",
          headerColor: "bg-gradient-to-r from-blue-600 to-purple-600",
          backPath: "/admin/dashboard"
        };
      case "hod":
        return {
          title: "Change Password",
          subtitle: "Change your password",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          backPath: "/hod/dashboard"
        };
      case "teacher":
        return {
          title: "Change Password",
          subtitle: "Change your password",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          backPath: "/teacher/dashboard"
        };
      case "student":
        return {
          title: "Change Password",
          subtitle: "Change your password",
          headerColor: "bg-gradient-to-r from-purple-600 to-pink-600",
          backPath: "/student/dashboard"
        };
      default:
        return {
          title: "Reset Password",
          subtitle: "Change your password",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          backPath: "/"
        };
    }
  };

  const roleConfig = getRoleConfig();

  // Use appropriate shell based on role
  const Shell = AdminMobileShell;
  const shellProps = role === "student" 
    ? { title: roleConfig.title, subtitle: roleConfig.subtitle, backTo: roleConfig.backPath }
    : { title: roleConfig.title, subtitle: roleConfig.subtitle, headerColor: roleConfig.headerColor, backTo: roleConfig.backPath };

  return (
    <Shell {...shellProps}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* Success Message in Form */}
        {successMessage && (
          <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
            ✓ {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`input-base pr-10 ${currentPasswordError ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="Enter your current password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("current")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? "👁️" : "🙈"}
              </button>
            </div>
            {currentPasswordError && (
              <p className="text-xs text-red-600 mt-1">{currentPasswordError}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`input-base pr-10 ${newPasswordError ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="Enter your new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.new ? "👁️" : "🙈"}
              </button>
            </div>
            {newPasswordError && (
              <p className="text-xs text-red-600 mt-1">{newPasswordError}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-base pr-10 ${confirmPasswordError ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="Confirm your new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? "👁️" : "🙈"}
              </button>
            </div>
            {confirmPasswordError && (
              <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>
    </Shell>
  );
}
