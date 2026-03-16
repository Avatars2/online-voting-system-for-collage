import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import { isValidEmail, validatePassword } from "../../utils/validation";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function HODRegistration() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [emailValidation, setEmailValidation] = useState({ isValid: false, message: "" });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    department: ""
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log("Fetching available departments...");
        
        // Use admin API to get departments
        const response = await adminAPI.departments.list();
        console.log("Departments response:", response);
        
        // Filter departments that don't have HOD assigned
        const availableDepartments = response.data?.filter(dept => !dept.hod) || [];
        console.log("Available departments (no HOD):", availableDepartments);
        setDepartments(availableDepartments);
        
        if (availableDepartments.length === 0) {
          console.log("No departments available without HOD");
        }
        
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        // Don't show error to user, just use empty list
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  // Email validation handler
  const handleEmailValidation = async (email) => {
    if (!email.trim()) {
      setEmailValidation({ isValid: false, message: "" });
      return;
    }

    try {
      const response = await fetch('/api/validate/email-quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setEmailValidation({
          isValid: result.isValid,
          message: result.message || ""
        });
      } else {
        setEmailValidation({ isValid: false, message: "Validation failed" });
      }
    } catch (error) {
      // Fallback to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email.trim());
      setEmailValidation({
        isValid,
        message: isValid ? "" : "Please enter a valid email address"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }
    
    // Validate phone (optional but if provided, must be valid)
    if (formData.phone.trim() && !/^[+]?[\d\s\-\(\)]+$/.test(formData.phone.trim())) {
      setError("Please enter a valid phone number");
      return;
    } else if (formData.phone.trim() && formData.phone.replace(/\D/g, '').length < 10) {
      setError("Phone number must have at least 10 digits");
      return;
    }
    
    if (!formData.department) {
      setError("Please select a department");
      return;
    }

    try {
      setLoading(true);
      
      const hodData = {
        name: formData.name.trim() || `HOD of ${departments.find(d => d._id === formData.department)?.name || 'Department'}`,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || "",
        departmentId: formData.department
      };

      console.log("Registering HOD with data:", hodData);
      
      // Use the correct admin API endpoint for HOD registration
      const response = await adminAPI.registerHOD(hodData);
      console.log("HOD registered successfully:", response);
      
      setSuccessMessage(`HOD registration successful! ${response.data.hod.name} (${response.data.hod.email}) is now Head of Department.`);
      showSuccess(`HOD registered successfully!`);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        department: ""
      });
      
      // Redirect to admin department page after 2 seconds
      setTimeout(() => {
        navigate("/admin/departments");
      }, 2000);
      
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err.response?.data?.error || err.message || "Registration failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Trigger email validation for email field
    if (name === 'email') {
      handleEmailValidation(value);
    }
  };

  return (
    <AdminMobileShell
      title="HOD Registration"
      subtitle="Register as Head of Department"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Optional)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Enter your full name (optional)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-base ${
                error ? 'border-red-500' : 
                formData.email && emailValidation.isValid ? 'border-green-500' : 
                formData.email ? 'border-red-500' : ''
              }`}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
            {error && error.includes("Email") && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
            {formData.email && !error && emailValidation.message && (
              <p className={`text-xs mt-1 ${
                emailValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {emailValidation.message}
              </p>
            )}
            {formData.email && !error && emailValidation.isValid && (
              <p className="text-xs text-green-600 mt-1">✓ Valid email address</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`input-base ${
                error && error.includes("phone") ? 'border-red-500' : 
                formData.phone && !error.includes("phone") ? 'border-green-500' : ''
              }`}
              placeholder="Enter your phone number (optional)"
              disabled={loading}
            />
            {error && error.includes("phone") && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
            {formData.phone && !error && !error.includes("phone") && (
              <p className="text-xs text-green-600 mt-1">✓ Valid phone number</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Department *
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="input-base"
              disabled={loading}
              required
            >
              <option value="">Choose a department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {departments.length === 0 ? (
              <p className="text-xs text-red-500 mt-1">
                No departments available without HOD. Please contact admin to create departments first.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {departments.length} department{departments.length !== 1 ? 's' : ''} available without HOD
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Create a password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || departments.length === 0}
            className="btn-primary w-full"
          >
            {loading ? "Registering..." : "Register as HOD"}
          </button>
        </form>
      </div>
    </AdminMobileShell>
  );
}
