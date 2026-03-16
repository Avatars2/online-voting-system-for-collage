import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { validatePassword } from "../../utils/validation";
import { useToast } from "../../components/UI/Toast";

export default function UnifiedStudentRegistrationPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [userRole, setUserRole] = useState("");

  // State management
  const [form, setForm] = useState({ 
    name: "", 
    enrollmentId: "", 
    email: "", 
    phone: "", 
    tempPassword: "", 
    department: "", 
    class: "" 
  });
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [emailValidation, setEmailValidation] = useState({ isValid: false, message: "" });

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Fetch data based on role
  useEffect(() => {
    if (!userRole) return;

    const fetchData = async () => {
      try {
        switch (userRole) {
          case "admin":
            await fetchAdminData();
            break;
          case "hod":
            await fetchHODData();
            break;
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, [userRole]);

  const fetchAdminData = async () => {
    const [departmentsResponse, classesResponse] = await Promise.all([
      adminAPI.departments.list(),
      adminAPI.classes.list()
    ]);
    setDepartments(departmentsResponse.data || []);
    setClasses(classesResponse.data || []);
  };

  const fetchHODData = async () => {
    const [userResponse, deptResponse, classesResponse] = await Promise.all([
      authAPI.verifyToken(),
      hodAPI.getDepartment(),
      hodAPI.classes.list()
    ]);
    
    setUser(userResponse.data);
    const deptData = deptResponse.data;
    if (deptData && deptData.length > 0) {
      setDepartment(deptData[0]);
      setForm(prev => ({ ...prev, department: deptData[0]._id }));
    }
    setClasses(classesResponse.data || []);
  };

  // Email validation handler
  const handleEmailValidation = async (email) => {
    if (!email.trim()) {
      setEmailValidation({ isValid: false, message: "" });
      return;
    }

    // First do basic client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailValidation({ isValid: false, message: "Please enter a valid email address" });
      return;
    }

    // Then try server validation if available
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
        // If server fails, fall back to client-side validation
        setEmailValidation({
          isValid: true,
          message: ""
        });
      }
    } catch (error) {
      console.log('Email validation API not available, using client-side validation');
      // Fallback to basic validation
      setEmailValidation({
        isValid: true,
        message: ""
      });
    }
  };

  // Get role configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Register Student",
          subtitle: "Add new student to system",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          backTo: "/admin/students",
          canSelectDepartment: true,
          canSelectClass: true,
          apiCall: adminAPI.students.create
        };
      case "hod":
        return {
          title: "Register Student",
          subtitle: department?.name ? `Add student to ${department.name}` : "Add student to department",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          backTo: "/hod/students",
          canSelectDepartment: false, // HOD only has their department
          canSelectClass: true,
          apiCall: hodAPI.students.register
        };
      default:
        return {
          title: "Register Student",
          subtitle: "Add new student",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          backTo: `/${userRole}/students`,
          canSelectDepartment: false,
          canSelectClass: false,
          apiCall: null
        };
    }
  };

  const roleConfig = getRoleConfig();

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    }

    // Validate email
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      // Use the same validation logic as real-time validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Email is invalid";
      } else if (!form.email.endsWith('@college.edu') && !form.email.endsWith('.edu')) {
        newErrors.email = "Please use a valid educational email address";
      }
    }

    // Validate password
    const passwordValidation = validatePassword(form.tempPassword);
    if (!passwordValidation.isValid) {
      newErrors.tempPassword = passwordValidation.error;
    }

    // Validate phone (optional but if provided, must be valid)
    if (form.phone.trim() && !/^[+]?[\d\s\-\(\)]+$/.test(form.phone.trim())) {
      newErrors.phone = "Please enter a valid phone number";
    } else if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = "Phone number must have at least 10 digits";
    }

    // Validate class selection
    if (!form.class) {
      newErrors.class = "Please select a class";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // Trigger email validation for email field
    if (name === 'email') {
      handleEmailValidation(value);
    }
  };

  // Handle department change (admin only)
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    setForm(prev => ({ ...prev, department: deptId, class: "" }));
    
    // Filter classes by selected department
    const filteredClasses = classes.filter(cls => 
      cls.department?._id === deptId || cls.department === deptId
    );
    setClasses(filteredClasses);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        enrollmentId: form.enrollmentId.trim() || undefined,
        phone: form.phone.trim() || undefined,
        tempPassword: form.tempPassword,
        department: form.department || department?._id,
        class: form.class,
      };

      await roleConfig.apiCall(payload);
      
      // Reset form
      setForm({ 
        name: "", 
        enrollmentId: "", 
        email: "", 
        phone: "", 
        tempPassword: "", 
        department: userRole === "admin" ? "" : department?._id, 
        class: "" 
      });
      setErrors({});
      
      success("Student registered successfully!");
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate(roleConfig.backTo);
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to register student";
      setErrors({ submit: errorMessage });
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!userRole) {
    return (
      <AdminMobileShell title="Loading" subtitle="Please wait..." headerColor="bg-gradient-to-r from-gray-600 to-gray-700">
        <div className="text-white/90 text-sm">Loading...</div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell
      title={roleConfig.title}
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
      backTo={roleConfig.backTo}
    >
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">
          {errors.submit}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter student's full name"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 
                form.email && emailValidation.isValid ? 'border-green-500' : 
                form.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="student@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            )}
            {form.email && !errors.email && emailValidation.message && (
              <p className={`text-xs mt-1 ${
                emailValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {emailValidation.message}
              </p>
            )}
            {form.email && !errors.email && emailValidation.isValid && (
              <p className="text-xs text-green-600 mt-1">✓ Valid email address</p>
            )}
            {!form.email && (
              <p className="text-xs text-gray-500 mt-1">Please enter a valid educational email (.edu required)</p>
            )}
          </div>

          {/* Enrollment ID Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrollment ID
            </label>
            <input
              type="text"
              name="enrollmentId"
              value={form.enrollmentId}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional enrollment ID"
              disabled={loading}
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : 
                form.phone && !errors.phone ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="Optional phone number"
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
            )}
            {form.phone && !errors.phone && (
              <p className="text-xs text-green-600 mt-1">✓ Valid phone number</p>
            )}
          </div>

          {/* Department Field (Admin Only) */}
          {roleConfig.canSelectDepartment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleDepartmentChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Class Field */}
          {roleConfig.canSelectClass && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                name="class"
                value={form.class}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.class ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                required
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.year})
                  </option>
                ))}
              </select>
              {errors.class && (
                <p className="text-xs text-red-600 mt-1">{errors.class}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temporary Password *
            </label>
            <input
              type="password"
              name="tempPassword"
              value={form.tempPassword}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.tempPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter temporary password"
              disabled={loading}
            />
            {errors.tempPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.tempPassword}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters with letters, numbers, and special characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Register Student"}
          </button>
        </form>
      </div>
    </AdminMobileShell>
  );
}
