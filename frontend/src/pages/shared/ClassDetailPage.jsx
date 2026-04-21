import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";
import { validatePassword, validateEmail, validatePhone } from "../../utils/validation.js";

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function UnifiedClassDetailPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { id } = useParams();
  const [userRole, setUserRole] = useState("");
  
  // Data states
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [department, setDepartment] = useState(null);
  
  // Form states
  const [form, setForm] = useState({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [enrollmentIdError, setEnrollmentIdError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Auto-hide success message after 2 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  
  // Modal states
  const [showStudentProfile, setShowStudentProfile] = useState(null);
  const [showEditStudent, setShowEditStudent] = useState(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", studentId: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
  // Edit form validation states
  const [editNameError, setEditNameError] = useState("");
  const [editEmailError, setEditEmailError] = useState("");
  const [editStudentIdError, setEditStudentIdError] = useState("");
  const [editPhoneError, setEditPhoneError] = useState("");

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Fetch data based on role
  useEffect(() => {
    if (!userRole || !id) return;

    const fetchData = async () => {
      try {
        switch (userRole) {
          case "admin":
            await fetchAdminClassData();
            break;
          case "hod":
            await fetchHODClassData();
            break;
          case "teacher":
            await fetchTeacherClassData();
            break;
        }
      } catch (err) {
        console.error("Error fetching class data:", err);
        setError(err.response?.data?.error || "Failed to load class data");
      }
    };

    fetchData();
  }, [userRole, id]);

  const fetchAdminClassData = async () => {
    const [classResponse, studentsResponse] = await Promise.all([
      adminAPI.getClass(id),
      adminAPI.students.list()
    ]);
    
    setCls(classResponse.data);
    
    const list = studentsResponse.data || [];
    setStudents(list.filter((s) => s.class?._id === id || s.class === id));
  };

  const fetchHODClassData = async () => {
    const [classesResponse, studentsResponse] = await Promise.all([
      hodAPI.classes.list(),
      hodAPI.students.list()
    ]);
    
    const classList = classesResponse.data || [];
    const classDetail = classList.find(c => c._id === id);
    setCls(classDetail);
    
    const list = studentsResponse.data || [];
    setStudents(list.filter((s) => s.class?._id === id || s.class === id));
  };

  const fetchTeacherClassData = async () => {
    const [classResponse, studentsResponse] = await Promise.all([
      teacherAPI.getClass(id),
      teacherAPI.students.list()
    ]);
    
    setCls(classResponse.data);
    setStudents(studentsResponse.data || []);
    
    // Also get department info for navigation
    if (classResponse.data?.department) {
      setDepartment(classResponse.data.department);
    }
  };

  // Get role configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: cls?.name || "Class",
          subtitle: `Year ${cls?.year || "—"} • ${cls?.studentCount || students.length} Students`,
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          canEnroll: true,
          canEdit: true,
          canDelete: true,
          backTo: `/departments/${cls?.department?._id || cls?.department}`,
          studentType: "Class Students"
        };
      case "hod":
        return {
          title: cls?.name || "Class",
          subtitle: `Year ${cls?.year || "—"} • ${cls?.studentCount || students.length} Students`,
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          canEnroll: true,
          canEdit: true,
          canDelete: true,
          backTo: `/departments/${cls?.department?._id || cls?.department}`,
          studentType: "Class Students"
        };
      case "teacher":
        return {
          title: cls?.name || "Class",
          subtitle: `Year ${cls?.year || "—"} • ${students.length} Students`,
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          canEnroll: true, // Teachers can enroll students
          canEdit: true,
          canDelete: true, // Teachers can now delete students
          backTo: `/teacher/dashboard`,
          studentType: "My Class Students"
        };
      default:
        return {
          title: "Class",
          subtitle: "Class Information",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          canEnroll: false,
          canEdit: false,
          canDelete: false,
          canResetPassword: false,
          backTo: `/${userRole}/dashboard`,
          studentType: "Students"
        };
    }
  };

  const roleConfig = getRoleConfig();

  // Modal handlers
  const handleStudentClick = (student) => {
    setShowStudentProfile(student);
  };

  const closeModals = () => {
    setShowStudentProfile(null);
    setShowEditStudent(null);
    setShowEnrollmentModal(false);
    // Clear all validation errors
    setNameError("");
    setEnrollmentIdError("");
    setEmailError("");
    setPhoneError("");
    setPasswordError("");
    // Clear edit form validation errors
    setEditNameError("");
    setEditEmailError("");
    setEditStudentIdError("");
    setEditPhoneError("");
  };

  // Validation handlers
  const handleNameChange = (value) => {
    setForm({ ...form, name: value });
    // Only allow letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (value.trim() && !nameRegex.test(value)) {
      setNameError("Name can only contain letters and spaces");
    } else if (value.trim().length < 2) {
      setNameError("Name must be at least 2 characters long");
    } else {
      setNameError("");
    }
  };

  const handleEnrollmentIdChange = (value) => {
    setForm({ ...form, enrollmentId: value });
    // Allow text and numbers only
    const enrollmentRegex = /^[a-zA-Z0-9]+$/;
    if (value.trim() && !enrollmentRegex.test(value)) {
      setEnrollmentIdError("Enrollment ID can only contain letters and numbers");
    } else if (value.trim().length < 3) {
      setEnrollmentIdError("Enrollment ID must be at least 3 characters long");
    } else {
      setEnrollmentIdError("");
    }
  };

  const handleEmailChange = (value) => {
    setForm({ ...form, email: value });
    if (value.trim() && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else if (value.trim() && validateEmail(value)) {
      // Check for common email providers
      const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const domain = value.split('@')[1]?.toLowerCase();
      if (commonProviders.includes(domain)) {
        setEmailError(""); // Valid common provider
      } else {
        setEmailError(""); // Valid but uncommon domain
      }
    } else {
      setEmailError("");
    }
  };

  const handlePhoneChange = (value) => {
    // Auto-format phone number
    let formattedValue = value.replace(/\D/g, ''); // Remove non-digits
    if (formattedValue.length > 10) {
      formattedValue = formattedValue.slice(0, 10); // Limit to 10 digits
    }
    
    setForm({ ...form, phone: formattedValue });
    if (formattedValue && formattedValue.length < 10) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else if (formattedValue && formattedValue.length === 10) {
      // Format as XXX-XXX-XXXX
      const formatted = `${formattedValue.slice(0, 3)}-${formattedValue.slice(3, 6)}-${formattedValue.slice(6)}`;
      setForm({ ...form, phone: formatted });
      setPhoneError("");
    } else {
      setPhoneError("");
    }
  };

  const handlePasswordChange = (value) => {
    setForm({ ...form, tempPassword: value });
    if (value.trim() && value.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
    } else if (value.trim() && !/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
      setPasswordError("Password must contain both letters and numbers");
    } else {
      setPasswordError("");
    }
  };

  // Edit form validation handlers
  const handleEditNameChange = (value) => {
    setEditForm({ ...editForm, name: value });
    // Only allow letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (value.trim() && !nameRegex.test(value)) {
      setEditNameError("Name can only contain letters and spaces");
    } else if (value.trim().length < 2) {
      setEditNameError("Name must be at least 2 characters long");
    } else {
      setEditNameError("");
    }
  };

  const handleEditEmailChange = (value) => {
    setEditForm({ ...editForm, email: value });
    if (value.trim() && !validateEmail(value)) {
      setEditEmailError("Please enter a valid email address");
    } else {
      setEditEmailError("");
    }
  };

  const handleEditStudentIdChange = (value) => {
    setEditForm({ ...editForm, studentId: value });
    // Allow text and numbers only
    const enrollmentRegex = /^[a-zA-Z0-9]+$/;
    if (value.trim() && !enrollmentRegex.test(value)) {
      setEditStudentIdError("Student ID can only contain letters and numbers");
    } else if (value.trim().length < 3) {
      setEditStudentIdError("Student ID must be at least 3 characters long");
    } else {
      setEditStudentIdError("");
    }
  };

  const handleEditPhoneChange = (value) => {
    setEditForm({ ...editForm, phone: value });
    if (value.trim()) {
      const phoneValidation = validatePhone(value);
      if (!phoneValidation.isValid) {
        setEditPhoneError(phoneValidation.error);
      } else {
        setEditPhoneError("");
      }
    } else {
      setEditPhoneError("");
    }
  };

  // Edit student handlers
  const handleEditStudent = (student) => {
    setShowEditStudent(student._id);
    setEditForm({
      name: student.name,
      email: student.email,
      studentId: student.studentId || "",
      phone: student.phone || "",
    });
    setShowStudentProfile(null);
    // Clear edit form validation errors
    setEditNameError("");
    setEditEmailError("");
    setEditStudentIdError("");
    setEditPhoneError("");
  };

  const handleSaveEdit = async () => {
    // Clear all errors
    setError("");
    setEditNameError("");
    setEditEmailError("");
    setEditStudentIdError("");
    setEditPhoneError("");
    
    // Validate name
    if (!editForm.name.trim()) {
      setEditNameError("Name is required");
      return;
    }
    
    if (editForm.name.trim().length < 2) {
      setEditNameError("Name must be at least 2 characters long");
      return;
    }
    
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(editForm.name.trim())) {
      setEditNameError("Name can only contain letters and spaces");
      return;
    }
    
    // Validate email
    if (!editForm.email.trim()) {
      setEditEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(editForm.email)) {
      setEditEmailError("Please enter a valid email address");
      return;
    }
    
    // Validate student ID (optional but if provided, must be valid)
    if (editForm.studentId.trim()) {
      if (editForm.studentId.trim().length < 3) {
        setEditStudentIdError("Student ID must be at least 3 characters long");
        return;
      }
      
      const enrollmentRegex = /^[a-zA-Z0-9]+$/;
      if (!enrollmentRegex.test(editForm.studentId.trim())) {
        setEditStudentIdError("Student ID can only contain letters and numbers");
        return;
      }
    }
    
    // Validate phone (optional but if provided, must be valid)
    if (editForm.phone.trim()) {
      const phoneValidation = validatePhone(editForm.phone);
      if (!phoneValidation.isValid) {
        setEditPhoneError(phoneValidation.error);
        return;
      }
    }

    setEditLoading(true);
    try {
      // Use appropriate API based on role
      switch (userRole) {
        case "admin":
          await adminAPI.students.update(showEditStudent, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
        case "hod":
          await hodAPI.students.update(showEditStudent, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
        case "teacher":
          await teacherAPI.students.update(showEditStudent, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
      }

      setError("");
      closeModals();
      
      // Refresh students list
      await fetchStudents();
    } catch (err) {
      console.error("Failed to update student:", err);
      setError(err.response?.data?.error || "Failed to update student");
      showError(err.response?.data?.error || "Failed to update student");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete student handler
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      console.log(`Deleting student ${studentId} as ${userRole}`);
      
      // Use appropriate API based on role
      switch (userRole) {
        case "admin":
          await adminAPI.students.delete(studentId);
          break;
        case "hod":
          await hodAPI.students.delete(studentId);
          break;
        case "teacher":
          await teacherAPI.students.delete(studentId);
          break;
        default:
          throw new Error("Unauthorized to delete students");
      }

      setError("");
      closeModals();
      setSuccessMessage("Student deleted successfully!");
      
      // Refresh students list
      await fetchStudents();
    } catch (err) {
      console.error("Failed to delete student:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to delete student";
      setError(errorMessage);
    }
  };


  // Enroll student handler
  const handleEnroll = async () => {
    // Reset all errors
    setError("");
    setNameError("");
    setEnrollmentIdError("");
    setEmailError("");
    setPhoneError("");
    setPasswordError("");
    
    // Validate name
    if (!form.name.trim()) {
      setNameError("Full name is required");
      return;
    }
    
    if (form.name.trim().length < 2) {
      setNameError("Name must be at least 2 characters long");
      return;
    }
    
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(form.name.trim())) {
      setNameError("Name can only contain letters and spaces");
      return;
    }
    
    // Validate enrollment ID (optional but if provided, must be valid)
    if (form.enrollmentId.trim()) {
      if (form.enrollmentId.trim().length < 3) {
        setEnrollmentIdError("Enrollment ID must be at least 3 characters long");
        return;
      }
      
      const enrollmentRegex = /^[a-zA-Z0-9]+$/;
      if (!enrollmentRegex.test(form.enrollmentId.trim())) {
        setEnrollmentIdError("Enrollment ID can only contain letters and numbers");
        return;
      }
    }
    
    // Validate email
    if (!form.email.trim()) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(form.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    // Validate phone (optional but if provided, must be valid)
    if (form.phone.trim()) {
      const phoneValidation = validatePhone(form.phone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error);
        return;
      }
    }
    
    // Validate password
    if (!form.tempPassword) {
      setPasswordError("Password is required");
      return;
    }
    
    if (form.tempPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(form.tempPassword)) {
      setPasswordError("Password must contain both letters and numbers");
      return;
    }
    
    setLoading(true);
    
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      enrollmentId: form.enrollmentId.trim() || undefined,
      phone: form.phone.trim() || undefined,
      tempPassword: form.tempPassword,
      department: cls?.department?._id || cls?.department,
      class: id,
    };

    // Use appropriate API based on role
    const apiCall = userRole === "admin" 
      ? adminAPI.students.create(payload)
      : userRole === "hod"
        ? hodAPI.students.register(payload)
        : teacherAPI.students.create(payload);

    apiCall
      .then(() => {
        setSuccessMessage("Student registered successfully!");
        setForm({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
        fetchStudents();
        // Close modal and stay on current page
        setShowEnrollmentModal(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to enroll student");
        showError(err.response?.data?.error || "Failed to enroll student");
      })
      .finally(() => setLoading(false));
  };

  // Refresh students based on role
  const fetchStudents = async () => {
    try {
      switch (userRole) {
        case "admin":
          await fetchAdminClassData();
          break;
        case "hod":
          await fetchHODClassData();
          break;
        case "teacher":
          await fetchTeacherClassData();
          break;
      }
    } catch (err) {
      console.error("Failed to refresh students:", err);
    }
  };

  // Render student card
  const renderStudentCard = (student) => {
    return (
      <div
        key={student._id}
        className={`${userRole === "admin" ? "bg-blue-50 hover:bg-blue-100 border border-blue-200" : "bg-gray-50"} rounded-xl p-3 transition-colors`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{student.name}</h3>
            <div className="mt-1 space-y-1">
              <p className="text-xs text-gray-600 truncate">
                📧 {student.email}
              </p>
              <p className="text-xs text-gray-600">
                🆔 {student.studentId || "N/A"}
              </p>
              {student.phone && (
                <p className="text-xs text-gray-600">
                  📱 {student.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {roleConfig.canEdit && (
              <button
                onClick={() => handleEditStudent(student)}
                className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-xs font-medium whitespace-nowrap"
              >
                Edit
              </button>
            )}
            
            {roleConfig.canResetPassword && (
              <button
                onClick={() => handlePasswordReset(student)}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium whitespace-nowrap"
              >
                Reset
              </button>
            )}
            
            {roleConfig.canDelete && (
              <button
                onClick={() => handleDeleteStudent(student._id, student.name)}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors whitespace-nowrap"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render enrollment modal
  const renderEnrollmentModal = () => {
    if (!showEnrollmentModal || !roleConfig.canEnroll) return null;

    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md relative border border-gray-200 shadow-xl">
          {/* Close Button */}
          <button
            onClick={closeModals}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl font-bold text-gray-900 mb-4">Register New Student</h2>
          
          {/* Success Message in Form */}
          {successMessage && (
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
              ✓ {successMessage}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  nameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter student's full name"
              />
              {nameError && (
                <p className="mt-1 text-xs text-red-600">{nameError}</p>
              )}
            </div>

            {/* Enrollment ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enrollment ID
              </label>
              <input
                type="text"
                value={form.enrollmentId}
                onChange={(e) => handleEnrollmentIdChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  enrollmentIdError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g. 2026CS101"
              />
              {enrollmentIdError && (
                <p className="mt-1 text-xs text-red-600">{enrollmentIdError}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  emailError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="studentname@gmail.com"
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  phoneError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="10-digit mobile number"
              />
              {phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
            </div>

            {/* Temp Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.tempPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    passwordError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
              <button
                onClick={handleEnroll}
                disabled={loading || !form.name.trim() || !form.email.trim() || !form.tempPassword || nameError || enrollmentIdError || emailError || phoneError || passwordError}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Registering...
                  </>
                ) : (
                  "Register Student"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render student profile modal
  const renderStudentProfileModal = () => {
    if (!showStudentProfile) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.name}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.email}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.studentId}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.phone}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.department?.name}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                {showStudentProfile.class?.name}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-col">
            <div className="flex gap-2">
              {roleConfig.canEdit && (
                <button
                  onClick={() => handleEditStudent(showStudentProfile)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {roleConfig.canDelete && (
                <button
                  onClick={() => handleDeleteStudent(showStudentProfile._id, showStudentProfile.name)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render edit student modal
  const renderEditStudentModal = () => {
    if (!showEditStudent) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Student</h2>
            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleEditNameChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  editNameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Student name"
              />
              {editNameError && (
                <p className="mt-1 text-xs text-red-600">{editNameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => handleEditEmailChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  editEmailError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Student email"
              />
              {editEmailError && (
                <p className="mt-1 text-xs text-red-600">{editEmailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                value={editForm.studentId}
                onChange={(e) => handleEditStudentIdChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  editStudentIdError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Student ID"
              />
              {editStudentIdError && (
                <p className="mt-1 text-xs text-red-600">{editStudentIdError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => handleEditPhoneChange(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                  editPhoneError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Phone number"
              />
              {editPhoneError && (
                <p className="mt-1 text-xs text-red-600">{editPhoneError}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveEdit}
              disabled={editLoading || !editForm.name.trim() || !editForm.email.trim() || editNameError || editEmailError || editStudentIdError || editPhoneError}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!cls) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AdminMobileShell
      title={roleConfig.title}
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
      backTo={roleConfig.backTo}
    >
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

      {/* Students List */}
      {roleConfig.canEnroll && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <button
            onClick={() => setShowEnrollmentModal(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            Register New Student
          </button>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">{roleConfig.studentType}</div>
        <div className="space-y-2">
          {students.map(renderStudentCard)}
        </div>
      </div>

      {/* Modals */}
      {renderStudentProfileModal()}
      {renderEditStudentModal()}
      {renderEnrollmentModal()}
    </AdminMobileShell>
  );
}
