import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { isValidEmail, validatePassword, sanitizeInput } from "../utils/validation";
import { ButtonSkeleton, FormSkeleton } from "../components/LoadingSkeleton";
import EnhancedInput from "../components/UI/EnhancedInput";
import EnhancedButton from "../components/UI/EnhancedButton";
import { useToast } from "../components/UI/Toast";

export default function Login() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    setFormData({ ...formData, [name]: sanitizedValue });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!isValidEmail(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0];
        } else {
          delete newErrors.password;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const emailError = !formData.email ? 'Email is required' : 
                      !isValidEmail(formData.email) ? 'Please enter a valid email address' : null;
    const passwordValidation = validatePassword(formData.password);
    
    if (emailError || !passwordValidation.isValid) {
      setErrors({
        email: emailError,
        password: passwordValidation.errors[0]
      });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login(formData.email.trim().toLowerCase(), formData.password);
      const { token, redirect, role } = res.data || {};
      
      if (!token || !redirect) {
        showError('Invalid server response');
        return;
      }
      
      localStorage.setItem("token", token);
      localStorage.setItem("role", role || "");
      localStorage.setItem("user", JSON.stringify({ role }));
      
      success('Login successful! Redirecting...');
      setTimeout(() => navigate(redirect), 1000);
    } catch (err) {
      showError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : '';
  };

  const isFormValid = () => {
    return formData.email && 
           formData.password && 
           isValidEmail(formData.email) && 
           validatePassword(formData.password).isValid &&
           !loading;
  };

  if (loading && !formData.email && !formData.password) {
    return <FormSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
              <span className="text-3xl font-bold text-white">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">OVS</h1>
            <p className="text-gray-600 text-sm">Online Voting System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <EnhancedInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your email"
              error={getFieldError('email')}
              touched={touched.email}
              disabled={loading}
              required
              autoComplete="email"
              icon="📧"
              helperText="We'll never share your email with anyone else"
            />

            <EnhancedInput
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              error={getFieldError('password')}
              touched={touched.password}
              disabled={loading}
              required
              autoComplete="current-password"
              icon="🔒"
              helperText="Must be at least 6 characters with letters and numbers"
            />

            <EnhancedButton
              type="submit"
              disabled={!isFormValid()}
              loading={loading}
              fullWidth
              size="lg"
              icon="🚀"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </EnhancedButton>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center space-y-2">
              <div className="flex justify-center space-x-4 text-xs">
                <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot Password?
                </a>
                <span className="text-gray-400">•</span>
                <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                  Need Help?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
