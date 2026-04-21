import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminAPI, hodAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";
import { validateEmail, validatePhone } from "../../utils/validation.js";

export default function DepartmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: showError } = useToast();
  const [dept, setDept] = useState(null);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editTeacherEmail, setEditTeacherEmail] = useState("");
  const [editTeacherPassword, setEditTeacherPassword] = useState("");
  const [editTeacherPhone, setEditTeacherPhone] = useState("");
  const [removeTeacher, setRemoveTeacher] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [teacherNameError, setTeacherNameError] = useState("");
  const [teacherPasswordError, setTeacherPasswordError] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Auto-hide success message after 2 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    // Get user role from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");

    if (!id) return;
    
    // Get department details based on user role
    const fetchDepartment = async () => {
      try {
        let response;
        
        if (user.role === "admin") {
          // Admin uses adminAPI to get department
          response = await adminAPI.getDepartment(id);
          console.log("Admin department data:", response.data); // Debug log
          setDept(response.data);
          
          // Get classes for this department
          try {
            const classesResponse = await adminAPI.classes.list(id);
            setClasses(classesResponse.data || []);
          } catch (classErr) {
            console.error("Failed to load classes:", classErr);
            setClasses([]);
          }
        } else if (user.role === "hod") {
          // HOD uses hodAPI to get department (HOD-specific permissions)
          try {
            const deptsResponse = await hodAPI.getDepartment();
            const allDepartments = deptsResponse.data || [];
            const department = allDepartments.find(d => d._id === id);
            setDept(department);
            
            // HOD uses hodAPI to get classes in their department
            try {
              const classesResponse = await hodAPI.classes.list();
              setClasses(classesResponse.data || []);
            } catch (classErr) {
              console.error("Failed to load classes:", classErr);
              setClasses([]);
            }
          } catch (deptErr) {
            console.error("Failed to load department:", deptErr);
            setError("Failed to load department data");
          }
        }
      } catch (err) {
        console.error("Failed to load department:", err);
        let errorMessage = "Failed to load department";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
    };

    fetchDepartment();
  }, [id]);

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setEditClassName(classItem.name);
    setEditYear(classItem.year || "");
    setEditTeacherName("");
    setEditTeacherEmail("");
    setEditTeacherPassword("");
    setEditTeacherPhone("");
    setRemoveTeacher(false);
    setEmailError("");
    setPhoneError("");
    setEditModalOpen(true);
    setError("");
  };

  const handleUpdateClass = () => {
    if (!editClassName.trim()) {
      setError("Class name is required");
      return;
    }

    // Clear previous errors
    setError("");
    setEmailError("");
    setPhoneError("");
    setTeacherNameError("");
    setTeacherPasswordError("");

    setUpdateLoading(true);
    
    const payload = { 
      name: editClassName.trim(),
      year: editYear.trim() || undefined
    };
    
    // Handle teacher operations
    if (removeTeacher) {
      payload.removeTeacher = true;
    } else if (editTeacherEmail.trim()) {
      // Validate teacher name (if provided)
      if (editTeacherName.trim()) {
        if (editTeacherName.trim().length < 2) {
          setTeacherNameError("Teacher name must be at least 2 characters long");
          setUpdateLoading(false);
          return;
        }
        
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(editTeacherName.trim())) {
          setTeacherNameError("Teacher name can only contain letters and spaces");
          setUpdateLoading(false);
          return;
        }
      }
      
      // Validate email
      if (!validateEmail(editTeacherEmail)) {
        setEmailError("Please enter a valid email address");
        setUpdateLoading(false);
        return;
      }
      
      // Validate phone (if provided)
      if (editTeacherPhone.trim()) {
        const phoneValidation = validatePhone(editTeacherPhone);
        if (!phoneValidation.isValid) {
          setPhoneError(phoneValidation.error);
          setUpdateLoading(false);
          return;
        }
      }
      
      payload.teacherName = editTeacherName.trim() || undefined;
      payload.teacherEmail = editTeacherEmail.trim();
      payload.teacherPassword = editTeacherPassword.trim();
      payload.teacherPhone = editTeacherPhone.trim() || undefined;
      
      // Validate password
      if (!editTeacherPassword.trim()) {
        setTeacherPasswordError("Password is required");
        setUpdateLoading(false);
        return;
      }
      
      if (editTeacherPassword.length < 6) {
        setTeacherPasswordError("Password must be at least 6 characters long");
        setUpdateLoading(false);
        return;
      }
      
      if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(editTeacherPassword)) {
        setTeacherPasswordError("Password must contain both letters and numbers");
        setUpdateLoading(false);
        return;
      }
    }
    
    // Use appropriate API based on user role
    let apiCall;
    if (userRole === "admin") {
      apiCall = adminAPI.classes.update(editingClass._id, payload);
      console.log("Using admin API for class update:", editingClass._id);
    } else if (userRole === "hod") {
      // Ensure hodAPI.classes exists and has update method
      if (!hodAPI?.classes?.update) {
        setError("HOD API not available. Please refresh the page and try again.");
        setUpdateLoading(false);
        return;
      }
      
      apiCall = hodAPI.classes.update(editingClass._id, payload);
      console.log("Using HOD API for class update:", editingClass._id);
    } else {
      setError("Invalid user role for class update");
      setUpdateLoading(false);
      return;
    }
    
    apiCall
      .then((response) => {
        console.log("Class update response:", response);
        const className = editClassName.trim();
        setEditModalOpen(false);
        setEditingClass(null);
        
        // Refresh the classes list
        if (userRole === "admin") {
          adminAPI.classes.list(id).then((r) => {
            setClasses(r.data || []);
          }).catch((err) => {
            console.error("Failed to refresh classes:", err);
            setError("Class updated but failed to refresh list");
          });
        } else {
          hodAPI.classes.list().then((r) => {
            setClasses(r.data || []);
          }).catch((err) => {
            console.error("Failed to refresh classes:", err);
            setError("Class updated but failed to refresh list");
          });
        }
        
        if (removeTeacher) {
          // Teacher removed successfully
          setSuccessMessage("Teacher removed successfully!");
        } else if (editTeacherEmail.trim()) {
          // New teacher added successfully
          setSuccessMessage("Teacher added successfully!");
        } else {
          // Class updated successfully
          setSuccessMessage("Class updated successfully!");
        }
      })
      .catch((err) => {
        console.error("Class update error details:", {
          userRole,
          classId: editingClass._id,
          payload,
          error: err,
          errorResponse: err.response?.data,
          status: err.response?.status
        });
        
        // Handle specific error types
        let errorMessage = "Failed to update class";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        
        setError(errorMessage);
      })
      .finally(() => setUpdateLoading(false));
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingClass(null);
    setEditClassName("");
    setEditYear("");
    setEditTeacherName("");
    setEditTeacherEmail("");
    setEditTeacherPassword("");
    setEditTeacherPhone("");
    setRemoveTeacher(false);
    setEmailError("");
    setPhoneError("");
    setTeacherNameError("");
    setTeacherPasswordError("");
    setError("");
  };

  const handleTeacherNameChange = (value) => {
    setEditTeacherName(value);
    // Only allow letters and spaces
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (value.trim() && !nameRegex.test(value)) {
      setTeacherNameError("Teacher name can only contain letters and spaces");
    } else if (value.trim().length < 2) {
      setTeacherNameError("Teacher name must be at least 2 characters long");
    } else {
      setTeacherNameError("");
    }
  };

  const handleTeacherPasswordChange = (value) => {
    setEditTeacherPassword(value);
    if (value.trim() && value.length < 6) {
      setTeacherPasswordError("Password must be at least 6 characters long");
    } else if (value.trim() && !/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
      setTeacherPasswordError("Password must contain both letters and numbers");
    } else {
      setTeacherPasswordError("");
    }
  };

  const handleEmailChange = (value) => {
    setEditTeacherEmail(value);
    if (value.trim() && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handlePhoneChange = (value) => {
    setEditTeacherPhone(value);
    if (value.trim()) {
      const phoneValidation = validatePhone(value);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error);
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete class "${className}"?\n\nThis action will PERMANENTLY delete:\n• All students in this class\n• The class teacher account`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      // Use appropriate API based on user role
      const apiCall = userRole === "admin" ? adminAPI.classes.delete(classId) : hodAPI.classes.delete(classId);
      const response = await apiCall;
      console.log(`Class ${className} deleted successfully`, response.data);
      
      // Class deleted successfully
      setSuccessMessage("Class deleted successfully!");
      
      // Refresh the classes list
      if (userRole === "admin") {
        try {
          const classesResponse = await adminAPI.classes.list(id);
          setClasses(classesResponse.data || []);
        } catch (refreshErr) {
          console.error("Failed to refresh classes:", refreshErr);
          setError("Class deleted but failed to refresh list");
        }
      } else {
        try {
          const classesResponse = await hodAPI.classes.list();
          setClasses(classesResponse.data || []);
        } catch (refreshErr) {
          console.error("Failed to refresh classes:", refreshErr);
          setError("Class deleted but failed to refresh list");
        }
      }
    } catch (err) {
      console.error("Failed to delete class:", err);
      let errorMessage = "Failed to delete class";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateClass = () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const payload = { 
      name: className.trim(), 
      department: id,
      year: year.trim() || undefined
    };
    
    const apiCall = userRole === "admin" ? adminAPI.classes.create(payload) : hodAPI.classes.create(payload);
    
    apiCall
      .then((response) => {
        console.log("Class created successfully:", response);
        setSuccessMessage("Class created successfully!");
        setClassName("");
        setYear("");
        
        // Force refresh after a short delay to ensure backend sync
        setTimeout(() => {
          if (userRole === "admin") {
            // Admin uses adminAPI
            adminAPI.classes.list(id).then((r) => {
              const deptClasses = r.data || [];
              console.log("Force refreshed classes:", deptClasses);
              setClasses(deptClasses);
            }).catch((err) => {
              console.error("Failed to refresh classes:", err);
              setError("Class created but failed to refresh list");
            });
          } else {
            // HOD uses hodAPI
            hodAPI.classes.list().then((r) => {
              console.log("Force refreshed classes:", r.data);
              setClasses(r.data || []);
            }).catch((err) => {
              console.error("Failed to refresh classes:", err);
              setError("Class created but failed to refresh list");
            });
          }
        }, 1000);
      })
      .catch((err) => {
        console.error("Class creation error:", err);
        let errorMessage = "Failed to create class";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      })
      .finally(() => setLoading(false));
  };

  if (!dept) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AdminMobileShell
      title={`${dept.name}`}
      subtitle={dept.hod?.name ? `${dept.hod.name} (HOD)` : "Pending (HOD)"}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo={userRole === "admin" ? "/admin/departments" : "/hod/dashboard"}
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Create New Class</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Class Name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="input-base"
            disabled={loading}
          />
          <input
            type="text"
            className="input-base"
            placeholder="Year (e.g., 3rd Year)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={loading}
          />
          
          <button onClick={handleCreateClass} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Class"}
          </button>
        </div>
        
              </div>

      {/* Edit Class Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            {/* Close Button */}
            <button
              onClick={() => setEditModalOpen(false)}
              disabled={updateLoading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Class</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="input-base"
                  disabled={updateLoading}
                  placeholder="e.g. TY-CS (C)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="input-base"
                  disabled={updateLoading}
                  placeholder="e.g. 3rd Year"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Teacher Management</h3>
                
                {/* Current Teacher Status */}
                {editingClass?.classTeacher && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm font-medium text-blue-900 mb-1">Current Teacher:</p>
                    <p className="text-sm text-blue-800">{editingClass.classTeacher.name}</p>
                    <p className="text-xs text-blue-600">{editingClass.classTeacher.email}</p>
                  </div>
                )}
                
                {!editingClass?.classTeacher && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-600">No teacher assigned to this class</p>
                  </div>
                )}

                {/* Teacher Actions */}
                <div className="space-y-3">
                  {editingClass?.classTeacher && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="removeTeacher"
                        checked={removeTeacher}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Show confirmation popup before removing teacher
                            const teacherName = editingClass?.classTeacher?.name || "the current teacher";
                            if (!window.confirm(`Are you sure you want to remove ${teacherName} from this class?`)) {
                              return; // Don't check the box if user cancels
                            }
                          }
                          setRemoveTeacher(e.target.checked);
                          if (e.target.checked) {
                            setEditTeacherName("");
                            setEditTeacherEmail("");
                            setEditTeacherPassword("");
                            setEditTeacherPhone("");
                          }
                        }}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        disabled={updateLoading}
                      />
                      <label htmlFor="removeTeacher" className="text-sm font-medium text-red-700">
                        Remove current teacher from class
                      </label>
                    </div>
                  )}
                  
                  {/* Show teacher registration form only if NO teacher exists OR if "Remove Teacher" is checked */}
                  {(!editingClass?.classTeacher || removeTeacher) && (
                    <>
                      <p className="text-xs text-gray-500 font-medium">
                        {removeTeacher ? "Register New Teacher (after removing current):" : "Register New Teacher:"}
                      </p>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teacher Name
                        </label>
                        <input
                          type="text"
                          value={editTeacherName}
                          onChange={(e) => handleTeacherNameChange(e.target.value)}
                          className={`input-base ${teacherNameError ? 'border-red-300 focus:border-red-500' : ''}`}
                          disabled={updateLoading}
                          placeholder="Teacher Full Name"
                        />
                        {teacherNameError && (
                          <p className="mt-1 text-xs text-red-600">{teacherNameError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teacher Email *
                        </label>
                        <input
                          type="email"
                          value={editTeacherEmail}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          className={`input-base ${emailError ? 'border-red-300 focus:border-red-500' : ''}`}
                          disabled={updateLoading}
                          placeholder="teachername@gmail.com"
                        />
                        {emailError && (
                          <p className="mt-1 text-xs text-red-600">{emailError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teacher Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showTeacherPassword ? "text" : "password"}
                            value={editTeacherPassword}
                            onChange={(e) => handleTeacherPasswordChange(e.target.value)}
                            className={`input-base pr-12 ${teacherPasswordError ? 'border-red-300 focus:border-red-500' : ''}`}
                            disabled={updateLoading}
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            disabled={updateLoading}
                          >
                            {showTeacherPassword ? (
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
                        {teacherPasswordError && (
                          <p className="mt-1 text-xs text-red-600">{teacherPasswordError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teacher Phone
                        </label>
                        <input
                          type="tel"
                          value={editTeacherPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={`input-base ${phoneError ? 'border-red-300 focus:border-red-500' : ''}`}
                          disabled={updateLoading}
                          placeholder="10-digit mobile number"
                        />
                        {phoneError && (
                          <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleUpdateClass}
                  disabled={updateLoading}
                  className="btn-primary"
                >
                  {updateLoading ? "Updating..." : "Update Class"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )} 

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Dept Classes</div>
          <div className="text-xs font-semibold text-gray-500">{classes.length} Active</div>
        </div>
        <div className="space-y-2">
          {classes.map((c) => (
            <div
              key={c._id}
              className="w-full p-4 border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <div className="flex justify-between items-start">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(userRole === "admin" ? `/admin/classes/${c._id}` : `/hod/classes/${c._id}`)}
                >
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{c.year || "—"}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Teacher: {c.classTeacher?.name || "Pending"}
                  </p>
                  {c.classTeacher?.email && (
                    <p className="text-xs text-gray-500 mt-1">{c.classTeacher.email}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 cursor-pointer" onClick={() => navigate(userRole === "admin" ? `/admin/classes/${c._id}` : `/hod/classes/${c._id}`)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClass(c);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(c._id, c.name);
                    }}
                    disabled={deleteLoading}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? "..." : "🗑️ Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Registration Section - Removed */}
      {/* Teacher registration is now integrated into the class edit modal */}
    </AdminMobileShell>
  );
}
