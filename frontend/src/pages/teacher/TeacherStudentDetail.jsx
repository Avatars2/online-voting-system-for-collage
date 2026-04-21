import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { teacherAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function TeacherStudentDetail() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { success, error: showError } = useToast();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", studentId: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Get all students and find the specific one
        const response = await teacherAPI.students.list();
        const students = response.data || [];
        const foundStudent = students.find(s => s._id === studentId);
        
        if (foundStudent) {
          setStudent(foundStudent);
          setEditForm({
            name: foundStudent.name || "",
            email: foundStudent.email || "",
            studentId: foundStudent.studentId || "",
            phone: foundStudent.phone || "",
          });
        } else {
          setError("Student not found");
        }
      } catch (err) {
        console.error("Failed to fetch student:", err);
        setError(err.response?.data?.error || "Failed to load student");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError("Name and email are required");
      return;
    }

    setEditLoading(true);
    try {
      await teacherAPI.students.update(studentId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        studentId: editForm.studentId.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });

      setError("");
      setShowEditModal(false);
      setSuccessMessage("Student updated successfully!");
      
      // Refresh student data
      const response = await teacherAPI.students.list();
      const students = response.data || [];
      const updatedStudent = students.find(s => s._id === studentId);
      if (updatedStudent) {
        setStudent(updatedStudent);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update student");
      showError(err.response?.data?.error || "Failed to update student");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Both passwords are required");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          email: student.email,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setError("");
        setShowPasswordReset(false);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
        setSuccessMessage("Password reset successfully!");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Failed to reset password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      await teacherAPI.students.delete(studentId);
      setSuccessMessage("Student deleted successfully!");
      navigate("/teacher/class");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete student");
      showError(err.response?.data?.error || "Failed to delete student");
    }
  };

  if (loading) {
    return (
      <AdminMobileShell title="Student Details" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading student information...</div>
        </div>
      </AdminMobileShell>
    );
  }

  if (error || !student) {
    return (
      <AdminMobileShell title="Student Details" subtitle="Error">
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error || "Student not found"}
        </div>
        <button
          onClick={() => navigate("/teacher/class")}
          className="w-full mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Back to Class
        </button>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell 
      title="Student Details" 
      subtitle={`${student.name} - Information`}
      backTo="/teacher/class"
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

      {/* Student Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Personal Information</div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Name</div>
            <div className="text-sm font-semibold text-gray-900">{student.name}</div>
          </div>
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Email</div>
            <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">{student.email}</div>
          </div>
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Student ID</div>
            <div className="text-sm font-semibold text-gray-900">{student.studentId || "Not assigned"}</div>
          </div>
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Phone</div>
            <div className="text-sm font-semibold text-gray-900">{student.phone || "Not provided"}</div>
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Academic Information</div>
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Department</div>
            <div className="text-sm font-semibold text-gray-900">{student.department?.name || "Not assigned"}</div>
          </div>
          <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Class</div>
            <div className="text-sm font-semibold text-gray-900">{student.class?.name || "Not assigned"}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Actions</div>
        <div className="space-y-3">
          <button
            onClick={handleEdit}
            className="w-full p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 font-medium hover:bg-orange-100 transition"
          >
            Edit Student Information
          </button>
          <button
            onClick={() => setShowPasswordReset(true)}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-medium hover:bg-blue-100 transition"
          >
            Reset Password
          </button>
          <button
            onClick={handleDelete}
            className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium hover:bg-red-100 transition"
          >
            Delete Student
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Student</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
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
                onClick={() => setShowEditModal(false)}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="flex-1 p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
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
              <button onClick={() => setShowPasswordReset(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-gray-600">{student.email}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPasswordReset(false)}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={passwordLoading}
                className="flex-1 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {passwordLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
