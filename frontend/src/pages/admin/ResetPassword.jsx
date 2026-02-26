import { useState } from "react";
import { authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { validatePassword } from "../../utils/validation";
import { useToast } from "../../components/UI/Toast";

export default function ResetPassword(){
  const { success, error: showError } = useToast();
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Validate old password
    if (!oldPass.trim()) {
      newErrors.oldPass = "Current password is required";
    }

    // Validate new password using same validation as login
    const passwordValidation = validatePassword(newPass);
    if (!passwordValidation.isValid) {
      newErrors.newPass = passwordValidation.error;
    }

    // Validate confirm password
    if (newPass !== confirmPass) {
      newErrors.confirmPass = "Passwords do not match";
    }

    // Check if new password is same as old password
    if (oldPass === newPass) {
      newErrors.newPass = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(oldPass, newPass);
      success("Password changed successfully!");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
      setErrors({});
    } catch (err) {
      // Handle specific old password mismatch error
      if (err.response?.data?.error?.includes('old password') || 
          err.response?.data?.error?.includes('current password')) {
        setErrors({ oldPass: "Current password is incorrect" });
      } else {
        showError(err.response?.data?.error || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  return(
    <AdminMobileShell
      title="Reset Password"
      subtitle="Secure your account"
      headerColor="bg-gradient-to-r from-blue-600 to-purple-600"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <EnhancedInput
              type="password"
              placeholder="Enter your current password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              error={errors.oldPass}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <EnhancedInput
              type="password"
              placeholder="Min. 6 characters with letters, numbers, and special characters"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              error={errors.newPass}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <EnhancedInput
              type="password"
              placeholder="Repeat new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              error={errors.confirmPass}
              disabled={loading}
              required
            />
          </div>

          <EnhancedButton
            onClick={handleChange}
            disabled={loading}
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full mt-2"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </EnhancedButton>
        </div>
      </div>
    </AdminMobileShell>
  )
}
