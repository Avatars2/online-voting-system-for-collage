import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminAPI, teacherAPI } from "../../services/api";
import api from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function TeacherClassPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [form, setForm] = useState({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStudentProfile, setShowStudentProfile] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(null);
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" });
  const [resetLoading, setResetLoading] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", studentId: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
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

  // Test teacher API authentication
  const testTeacherAuth = async () => {
    try {
      console.log("=== Testing Teacher Auth ===");
      const testResponse = await api.get('/teacher/test');
      console.log("Teacher auth test response:", testResponse.data);
    } catch (err) {
      console.error("Teacher auth test failed:", err);
    }
  };

  // Try to fetch real data using teacher-specific endpoints
  const tryFetchRealData = async () => {
    try {
      setStudentsLoading(true);
      console.log("=== Starting data fetch for class:", id);
      
      // Check if user is authenticated
      const token = localStorage.getItem("token");
      console.log("Token exists:", !!token);
      console.log("Token length:", token?.length);
      
      // Get class details using teacher API
      const classResponse = await teacherAPI.getClass(id);
      console.log("Class response:", classResponse);
      const classData = classResponse.data;
      setCls(classData);
      
      // Get students using teacher API
      try {
        console.log("=== Getting students for teacher's class ===");
        const studentsResponse = await teacherAPI.students.list();
        console.log("Teacher API students response:", studentsResponse);
        const students = studentsResponse.data || [];
        console.log("Students count:", students.length);
        setStudents(students);
      } catch (studentsErr) {
        console.error("Failed to get students:", studentsErr);
        setStudents([]);
      }
    } catch (err) {
      console.error("=== Main Data Fetch Failed ===");
      console.error("Full error:", err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    
    // Show page immediately with fallback data
    const showPageWithFallback = () => {
      setCls({
        _id: id,
        name: `Class ${id.slice(-6)}`,
        year: "2024",
        department: { name: "Computer Science", _id: "dept123" },
        classTeacher: { name: "You" }
      });
      // Don't set students to empty here - let the API fetch real students
    };

    showPageWithFallback();
    testTeacherAuth();
    tryFetchRealData();
  }, [id]);

  const handleStudentClick = (student) => {
    navigate(`/teacher/student/${student._id}`);
  };

  const handlePasswordReset = (student) => {
    setShowPasswordReset(student);
    setShowStudentProfile(null);
  };

  const closeModals = () => {
    setShowStudentProfile(null);
    setShowPasswordReset(null);
    setShowEditStudent(null);
  };

  const handlePasswordResetSubmit = async () => {
    if (!resetForm.newPassword || !resetForm.confirmPassword) {
      setError("Both passwords are required");
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setResetLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          email: showPasswordReset.email,
          newPassword: resetForm.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage("Password reset successfully!");
        setShowPasswordReset(null);
        setResetForm({ newPassword: "", confirmPassword: "" });
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const handleEditStudent = (student) => {
    setShowEditStudent(student._id);
    setEditForm({
      name: student.name,
      email: student.email,
      studentId: student.studentId || "",
      phone: student.phone || "",
    });
    setShowStudentProfile(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Name and email are required");
      return;
    }

    setEditLoading(true);
    try {
      await teacherAPI.students.update(showEditStudent, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        studentId: editForm.studentId.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });

      setError("");
      closeModals();
      setSuccessMessage("Student updated successfully!");
      
      // Refresh students list using teacher API
      const studentsResponse = await teacherAPI.students.list(id);
      setStudents(studentsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update student");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      await teacherAPI.students.delete(studentId);
      setError("");
      closeModals();
      setSuccessMessage("Student deleted successfully!");
      
      // Refresh students list using teacher API
      const studentsResponse = await teacherAPI.students.list(id);
      setStudents(studentsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete student");
    }
  };

  const handleEnroll = () => {
    console.log("handleEnroll called with form:", form);
    console.log("cls data:", cls);
    console.log("class id:", id);
    
    if (!form.name.trim() || !form.email.trim() || !form.tempPassword) {
      setError("Name, Email and Temp Password are required");
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (form.tempPassword.length < 6) {
      setError("Temp password must be at least 6 characters");
      return;
    }
    // Add password validation requirements
    if (!/[a-zA-Z]/.test(form.tempPassword)) {
      setError("Password must contain at least one letter");
      return;
    }
    if (!/\d/.test(form.tempPassword)) {
      setError("Password must contain at least one number");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.tempPassword)) {
      setError("Password must contain at least one special character");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      enrollmentId: form.enrollmentId.trim() || undefined,
      phone: form.phone.trim() || undefined,
      tempPassword: form.tempPassword,
      department: cls?.department?._id || cls?.department,
      class: id,
    };
    
    console.log("Sending payload:", payload);
    
    // Use teacherAPI for student creation
    teacherAPI.students.create(payload)
    .then(async () => {
      setForm({ name: "", enrollmentId: "", email: "", phone: "", tempPassword: "" });
      setSuccessMessage("Student enrolled successfully!");
      
      // Refresh students list using teacher API
      const studentsResponse = await teacherAPI.students.list(id);
      setStudents(studentsResponse.data || []);
    })
    .catch((err) => {
      console.error("Error enrolling student:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      setError(err.response?.data?.error || "Failed to enroll student");
    })
    .finally(() => {
      setLoading(false);
    });
  };

  if (!cls) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  // Error boundary fallback
  if (error && typeof error === 'string' && error.includes('Something went wrong')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Page Error</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminMobileShell
      title={cls.name}
      subtitle={`Year ${cls.year || "—"} • ${cls.studentCount || students.length} Students`}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo={`/teacher/dashboard`}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          ✓ {successMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Student Enrollment</div>
        <div className="space-y-3">
          <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" />
          <input type="text" placeholder="Enrollment ID (e.g. 2026CS101)" value={form.enrollmentId} onChange={(e) => setForm({ ...form, enrollmentId: e.target.value })} className="input-base" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-base" />
          <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" />
          <input type="password" placeholder="Assign Temp Password" value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} className="input-base" />
          <button onClick={handleEnroll} disabled={loading} className="btn-primary w-full">
            {loading ? "Enrolling..." : "Enroll Student"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Class Students</div>
        <div className="space-y-2">
          {console.log("Rendering students list:", students)}
          {studentsLoading ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
              <div className="text-gray-400 text-2xl mb-2">⏳</div>
              <div className="text-gray-600 font-medium">Loading students...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
              <div className="text-gray-400 text-4xl mb-2">👥</div>
              <div className="text-gray-600 font-medium">No students in this class</div>
              <div className="text-gray-500 text-sm mt-1">Enroll students using the form above</div>
            </div>
          ) : (
            students.map((s) => (
              <div 
                key={s._id} 
                className="flex justify-between items-center p-3 border rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleStudentClick(s)}
              >
                <span className="font-medium text-gray-900">{s.studentId || s.email} {s.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Student Profile Modal */}
      {showStudentProfile && (
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
                <button
                  onClick={() => handleEditStudent(showStudentProfile)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowPasswordReset(showStudentProfile)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteStudent(showStudentProfile._id, showStudentProfile.name)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
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
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{showPasswordReset.name}</div>
                  <div className="text-sm text-gray-600">{showPasswordReset.email}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordResetSubmit}
                disabled={resetLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudent && (
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
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Student name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Student email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  type="text"
                  value={editForm.studentId}
                  onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Student ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
