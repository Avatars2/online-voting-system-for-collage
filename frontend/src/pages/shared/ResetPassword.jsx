import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import StudentMobileShell from "../../components/StudentMobileShell";
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

  useEffect(() => {
    const currentRole = localStorage.getItem("role");
    const token = localStorage.getItem("token");
    
    if (!token) {
      navigate("/");
      return;
    }
    
    setRole(currentRole);
  }, [navigate]);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear errors for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ""
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      await authAPI.changePassword(formData.currentPassword, formData.newPassword);
      
      setSuccessMessage("Password changed successfully!");
      showSuccess("Password changed successfully!");
      
      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setErrors({});

      // Redirect based on role after 2 seconds
      setTimeout(() => {
        const redirectPath = role === "student" ? "/student/profile" : 
                           role === "hod" ? "/hod/profile" : 
                           role === "teacher" ? "/teacher/profile" : 
                           "/admin/profile";
        navigate(redirectPath);
      }, 2000);

    } catch (err) {
      // Handle specific old password mismatch error
      if (err.response?.data?.error?.includes('old password') || 
          err.response?.data?.error?.includes('current password')) {
        setErrors({ currentPassword: "Current password is incorrect" });
        setError("Current password is incorrect");
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
          title: "Reset Password",
          subtitle: "Secure your account",
          headerColor: "bg-gradient-to-r from-blue-600 to-purple-600",
          backPath: "/admin/dashboard"
        };
      case "hod":
        return {
          title: "Change Password",
          subtitle: "Update your HOD password",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          backPath: "/hod/dashboard"
        };
      case "teacher":
        return {
          title: "Change Password",
          subtitle: "Update Your Password",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          backPath: "/teacher/dashboard"
        };
      case "student":
        return {
          title: "Reset Password",
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
  const Shell = role === "student" ? StudentMobileShell : AdminMobileShell;
  const shellProps = role === "student" 
    ? { title: roleConfig.title, subtitle: roleConfig.subtitle, backTo: roleConfig.backPath }
    : { title: roleConfig.title, subtitle: roleConfig.subtitle, headerColor: roleConfig.headerColor, backTo: roleConfig.backPath };

  return (
    <Shell {...shellProps}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
          ✓ {successMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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
                className={`input-base pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
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
            {errors.currentPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.currentPassword}</p>
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
                className={`input-base pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
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
            {errors.newPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters with letters, numbers, and special characters
            </p>
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
                className={`input-base pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
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
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Password Requirements:</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    formData.newPassword.length >= 6 ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-xs text-gray-600">At least 6 characters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    /(?=.*[a-z])/.test(formData.newPassword.toLowerCase()) ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-xs text-gray-600">Contains at least one letter</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    /(?=.*\d)/.test(formData.newPassword.toLowerCase()) ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-xs text-gray-600">Contains at least one number</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.newPassword) ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-xs text-gray-600">Contains at least one special character</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    formData.newPassword.length <= 128 ? "bg-green-500" : "bg-gray-300"
                  }`}></div>
                  <span className="text-xs text-gray-600">Less than 128 characters</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Password Tips */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Password Tips:</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use at least 6 characters</li>
          <li>• Include letters and numbers</li>
          <li>• Add special characters (!@#$%^&* etc.)</li>
          <li>• Keep it under 128 characters</li>
          <li>• Don't share your password with anyone</li>
        </ul>
      </div>
    </Shell>
  );
}
