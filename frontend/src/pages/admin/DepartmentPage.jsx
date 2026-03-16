import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";
import { getMessage, getValidationMessage, formatDeletionSummary, getApiErrorMessage } from "../../utils/messages.js";
import { validateEmail, validatePhone } from "../../utils/validation.js";

export default function DepartmentPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [name, setName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editName, setEditName] = useState("");
  const [editHodName, setEditHodName] = useState("");
  const [editHodEmail, setEditHodEmail] = useState("");
  const [editHodPassword, setEditHodPassword] = useState("");
  const [editHodPhone, setEditHodPhone] = useState("");
  const [removeHod, setRemoveHod] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showHodPassword, setShowHodPassword] = useState(false);

  const fetch = () => {
    adminAPI.departments.list().then((r) => {
      console.log("Departments fetched:", r.data);
      setDepartments(r.data || []);
    }).catch(() => setDepartments([]));
  };
  useEffect(() => fetch(), []);

  const handleCreate = () => {
    if (!name.trim()) {
      setError(getValidationMessage('name', 'required'));
      return;
    }

    setLoading(true);
    setError("");
    
    const payload = { name: name.trim() };
    
    adminAPI.departments
      .create(payload)
      .then((response) => {
        console.log("Department creation response:", response);
        const deptName = name.trim();
        setName("");
        fetch();
        success(getMessage('success', 'DEPARTMENT_CREATED'));
      })
      .catch((err) => {
        console.error("Department creation error:", err);
        console.error("Error response:", err.response);
        const errorMessage = getApiErrorMessage(err);
        setError(errorMessage);
        showError(errorMessage);
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteDepartment = async (departmentId, departmentName) => {
    if (!window.confirm(getMessage('warning', 'DELETE_DEPARTMENT_WARNING'))) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await adminAPI.departments.delete(departmentId);
      console.log(`Department ${departmentName} deleted successfully`, response.data);
      
      // Show detailed deletion summary
      const message = formatDeletionSummary(response.data, "Department");
      success(message);
      
      // Refresh the departments list
      fetch();
    } catch (err) {
      console.error("Failed to delete department:", err);
      const errorMessage = getApiErrorMessage(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setEditName(department.name);
    setEditHodName("");
    setEditHodEmail("");
    setEditHodPassword("");
    setEditHodPhone("");
    setRemoveHod(false);
    setEmailError("");
    setPhoneError("");
    setEditModalOpen(true);
    setError("");
  };

  const handleUpdateDepartment = () => {
    if (!editName.trim()) {
      setError(getValidationMessage('name', 'required'));
      return;
    }

    // Clear previous errors
    setError("");
    setEmailError("");
    setPhoneError("");

    setUpdateLoading(true);
    
    const payload = { 
      name: editName.trim()
    };
    
    // Handle HOD operations
    if (removeHod) {
      payload.removeHod = true;
    } else if (editHodEmail.trim()) {
      // Validate email
      if (!validateEmail(editHodEmail)) {
        setEmailError("Please enter a valid email address");
        setUpdateLoading(false);
        return;
      }
      
      // Validate phone (if provided)
      if (editHodPhone.trim()) {
        const phoneValidation = validatePhone(editHodPhone);
        if (!phoneValidation.isValid) {
          setPhoneError(phoneValidation.error);
          setUpdateLoading(false);
          return;
        }
      }
      
      payload.hodName = editHodName.trim() || undefined;
      payload.hodEmail = editHodEmail.trim();
      payload.hodPassword = editHodPassword.trim();
      payload.hodPhone = editHodPhone.trim() || undefined;
      
      if (!editHodPassword.trim()) {
        setError(getMessage('error', 'INVALID_PASSWORD_FORMAT'));
        setUpdateLoading(false);
        return;
      }
    }
    
    adminAPI.departments
      .update(editingDepartment._id, payload)
      .then((response) => {
        console.log("Department update response:", response);
        const deptName = editName.trim();
        setEditModalOpen(false);
        setEditingDepartment(null);
        fetch();
        
        if (removeHod) {
          success(getMessage('success', 'DEPARTMENT_HOD_REMOVED'));
        } else if (editHodEmail.trim()) {
          success(getMessage('success', 'DEPARTMENT_HOD_ASSIGNED'));
        } else {
          success(getMessage('success', 'DEPARTMENT_UPDATED'));
        }
      })
      .catch((err) => {
        console.error("Department update error:", err);
        console.error("Error response:", err.response);
        const errorMessage = getApiErrorMessage(err);
        setError(errorMessage);
        showError(errorMessage);
      })
      .finally(() => setUpdateLoading(false));
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingDepartment(null);
    setEditName("");
    setEditHodName("");
    setEditHodEmail("");
    setEditHodPassword("");
    setEditHodPhone("");
    setRemoveHod(false);
    setEmailError("");
    setPhoneError("");
    setError("");
  };

  const handleEmailChange = (value) => {
    setEditHodEmail(value);
    if (value.trim() && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handlePhoneChange = (value) => {
    setEditHodPhone(value);
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

  return (
    <AdminMobileShell
      title="Departments"
      subtitle="Institutional structure"
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo="/admin/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">New Department</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            disabled={loading}
          />
          
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Department"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Active Departments</div>
          <div className="text-xs font-semibold text-gray-500">{departments.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <div 
              key={d._id} 
              className="bg-white border rounded-xl p-4 hover:bg-gray-50 hover:border-blue-200 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/departments/${d._id}`)}>
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      HOD: <span className="font-medium text-gray-900">
                        {d.hod?.name || "Not assigned"}
                      </span>
                    </p>
                    {d.hod?.email && (
                      <p className="text-xs text-gray-500 mt-1">{d.hod.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 cursor-pointer" onClick={() => navigate(`/departments/${d._id}`)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDepartment(d);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDepartment(d._id, d.name);
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

      {/* Edit Department Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-xl">
            {/* Close Button */}
            <button
              onClick={handleCloseEditModal}
              disabled={updateLoading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Department</h2>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-base"
                  disabled={updateLoading}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">HOD Management</h3>
                
                {/* Current HOD Status */}
                {editingDepartment?.hod && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm font-medium text-blue-900 mb-1">Current HOD:</p>
                    <p className="text-sm text-blue-800">{editingDepartment.hod.name}</p>
                    <p className="text-xs text-blue-600">{editingDepartment.hod.email}</p>
                  </div>
                )}
                
                {!editingDepartment?.hod && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-600">No HOD assigned to this department</p>
                  </div>
                )}

                {/* HOD Actions */}
                <div className="space-y-3">
                  {editingDepartment?.hod && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="removeHod"
                        checked={removeHod}
                        onChange={(e) => {
                          setRemoveHod(e.target.checked);
                          if (e.target.checked) {
                            setEditHodName("");
                            setEditHodEmail("");
                            setEditHodPassword("");
                            setEditHodPhone("");
                          }
                        }}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        disabled={updateLoading}
                      />
                      <label htmlFor="removeHod" className="text-sm font-medium text-red-700">
                        Remove current HOD from department
                      </label>
                    </div>
                  )}
                  
                  {!removeHod && (
                    <>
                      <p className="text-xs text-gray-500 font-medium">Register New HOD (Optional):</p>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HOD Name
                        </label>
                        <input
                          type="text"
                          value={editHodName}
                          onChange={(e) => setEditHodName(e.target.value)}
                          className="input-base"
                          disabled={updateLoading}
                          placeholder="HOD Full Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HOD Email *
                        </label>
                        <input
                          type="email"
                          value={editHodEmail}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          className={`input-base ${emailError ? 'border-red-300 focus:border-red-500' : ''}`}
                          disabled={updateLoading}
                          placeholder="hodname@gmail.com"
                        />
                        {emailError && (
                          <p className="mt-1 text-xs text-red-600">{emailError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HOD Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showHodPassword ? "text" : "password"}
                            value={editHodPassword}
                            onChange={(e) => setEditHodPassword(e.target.value)}
                            className="input-base pr-12"
                            disabled={updateLoading}
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowHodPassword(!showHodPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            disabled={updateLoading}
                          >
                            {showHodPassword ? (
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HOD Phone
                        </label>
                        <input
                          type="tel"
                          value={editHodPhone}
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
                  onClick={handleUpdateDepartment}
                  disabled={updateLoading}
                  className="btn-primary"
                >
                  {updateLoading ? "Updating..." : "Update Department"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
