import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import { ButtonSkeleton, FormSkeleton } from "../../components/LoadingSkeleton";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { useToast } from "../../components/UI/Toast";

export default function Login() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Simple sanitization - trim whitespace
    const sanitizedValue = value.trim();
    // Clear form error when user starts typing
    setFormError('');
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
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
          newErrors.password = 'Password must contain both letters and numbers';
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
    setFormError(''); // Clear any previous form error
    
    // Validate all fields
    const emailError = !formData.email ? 'Email is required' : 
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Please enter a valid email address' : null;
    
    let passwordError = null;
    if (!formData.password) {
      passwordError = 'Password is required';
    } else if (formData.password.length < 6) {
      passwordError = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      passwordError = 'Password must contain both letters and numbers';
    }
    
    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError
      });
      return;
    }

    setLoading(true);
    try {
      // Try API login for MongoDB Atlas database users
      const res = await authAPI.login(formData.email.trim().toLowerCase(), formData.password);
      const { token, redirect, role } = res.data || {};
      
      if (!token || !redirect) {
        showError('Invalid server response');
        return;
      }
      
      localStorage.setItem("token", token);
      localStorage.setItem("role", role || "");
      localStorage.setItem("user", JSON.stringify({ role }));
      
      navigate(redirect);
      
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err.response?.data?.error || "Invalid email or password";
      setFormError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : '';
  };

  const isFormValid = () => {
    const emailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const passwordValid = formData.password && 
                       formData.password.length >= 6 && 
                       /(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password);
    
    return emailValid && passwordValid && !loading;
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      showError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      showError('Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    try {
      await authAPI.forgotPassword(resetEmail.trim().toLowerCase());
      success('Password reset link sent to your email');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      console.error('Forgot password error:', err);
      const errorData = err.response?.data;
      
      if (errorData?.code === 'RATE_LIMIT_EXCEEDED') {
        showError(`Too many password reset attempts. You have used ${errorData.attempts}/${errorData.maxAttempts} attempts. Please try again ${errorData.resetTime}.`);
      } else {
        showError(errorData?.error || 'Failed to send reset email');
      }
    } finally {
      setResetLoading(false);
    }
  };

  if (loading && !formData.email && !formData.password) {
    return <FormSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-12 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8 animate-fadeInDown">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4 animate-bounce">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
  <path d="M9 2v2H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2V2H9zm0 2h6v2H9V4zm2 6l5 4-5 4V8z"/>
</svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Online Voting System</h1>
            <p className="text-gray-600 text-sm">Secure Digital Democracy Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form-level error message */}
            {formError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-in slide-in-from-top-1">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 font-medium">{formError}</p>
                </div>
              </div>
            )}

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
            <div className="text-center">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgotPassword(true);
                }}
                className="text-blue-600 hover:text-blue-700 transition-colors text-xs"
              >
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 bg-opacity-95 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <EnhancedInput
                label="Email Address"
                name="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your registered email"
                disabled={resetLoading}
                required
                icon="📧"
                helperText="We'll send you a password reset link"
              />

              <EnhancedButton
                onClick={handleForgotPassword}
                disabled={!resetEmail || resetLoading}
                loading={resetLoading}
                fullWidth
                size="lg"
                icon="📧"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </EnhancedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
