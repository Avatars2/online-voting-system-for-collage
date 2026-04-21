import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";
import { validatePassword } from "../../utils/validation";

export default function UnifiedStudentsPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Data states
  const [students, setStudents] = useState([]);
  const [classData, setClassData] = useState(null);
  const [department, setDepartment] = useState(null);
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

  // Edit states
  const [editingId, setEditingId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    studentId: "",
    phone: ""
  });

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Fetch data based on role
  useEffect(() => {
    if (!userRole) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        switch (userRole) {
          case "admin":
            await fetchAdminStudents();
            break;
          case "hod":
            await fetchHODStudents();
            break;
          case "teacher":
            await fetchTeacherStudents();
            break;
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(err.response?.data?.error || "Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole]);

  const fetchAdminStudents = async () => {
    const response = await adminAPI.students.list();
    setStudents(response.data || []);
  };

  const fetchHODStudents = async () => {
    console.log("fetchHODStudents - starting...");
    const [studentsResponse, deptResponse] = await Promise.all([
      hodAPI.students.list(),
      hodAPI.getDepartment()
    ]);
    
    console.log("HOD Students Response:", studentsResponse.data);
    console.log("HOD Department Response:", deptResponse.data);
    
    setStudents(studentsResponse.data || []);
    
    if (deptResponse.data && deptResponse.data.length > 0) {
      setDepartment(deptResponse.data[0]);
    }
  };

  const fetchTeacherStudents = async () => {
    const profileResponse = await teacherAPI.profile();
    const userData = profileResponse.data?.user || profileResponse.data || null;
    
    if (userData?.assignedClass) {
      const classId = typeof userData.assignedClass === 'object' ? 
        userData.assignedClass._id || userData.assignedClass.toString() : 
        userData.assignedClass;
      
      const [classResponse, studentsResponse] = await Promise.all([
        teacherAPI.getClass(classId),
        teacherAPI.students.list()
      ]);
      
      if (classResponse.data) {
        setClassData(classResponse.data);
      }
      
      setStudents(studentsResponse.data || []);
    } else {
      setError("No class assigned to teacher");
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group students by department and class (for admin view) or by class (for HOD view)
  const getGroupedStudents = () => {
    if (userRole === "admin") {
      // Admin: Group by department and class
      const grouped = {};
      
      filteredStudents.forEach(student => {
        const deptName = student.department?.name || "Unassigned Department";
        const className = student.class?.name || "Unassigned Class";
        
        if (!grouped[deptName]) {
          grouped[deptName] = {};
        }
        
        if (!grouped[deptName][className]) {
          grouped[deptName][className] = [];
        }
        
        grouped[deptName][className].push(student);
      });

      return { grouped: true, data: grouped, type: 'admin' };
    } else if (userRole === "hod") {
      // HOD: Group by class only (within their department)
      const grouped = {};
      
      filteredStudents.forEach(student => {
        const className = student.class?.name || "Unassigned Class";
        
        if (!grouped[className]) {
          grouped[className] = [];
        }
        
        grouped[className].push(student);
      });

      return { grouped: true, data: grouped, type: 'hod' };
    } else {
      // Teacher: No grouping, just filtered list
      return { grouped: false, data: filteredStudents, type: 'teacher' };
    }
  };

  const groupingResult = getGroupedStudents();
  const isGrouped = groupingResult.grouped;
  const studentData = groupingResult.data;
  const groupType = groupingResult.type;

  // Get role configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Students",
          subtitle: `${students.length} registered students`,
          headerColor: "bg-gradient-to-r from-indigo-600 to-purple-700",
          canEdit: true,
          canDelete: true,
          showClassInfo: false,
          showDepartmentInfo: false,
          studentType: "All Students"
        };
      case "hod":
        return {
          title: "Students",
          subtitle: `${students.length} students in your department`,
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          canEdit: true,
          canDelete: true,
          showClassInfo: false,
          showDepartmentInfo: true,
          studentType: "Department Students (Grouped by Class)"
        };
      case "teacher":
        return {
          title: "Class Students",
          subtitle: `${classData?.name || "Class"} • ${filteredStudents.length} students`,
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          canEdit: true,
          canDelete: true,
          showClassInfo: true,
          showDepartmentInfo: false,
          studentType: "Class Students"
        };
      default:
        return {
          title: "Students",
          subtitle: "Student list",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          canEdit: false,
          canDelete: false,
          showClassInfo: false,
          showDepartmentInfo: false,
          studentType: "Students"
        };
    }
  };

  const roleConfig = getRoleConfig();

  // Edit handlers - open modal
  const handleEdit = (student) => {
    if (!roleConfig.canEdit) return;
    
    setEditingId(student._id);
    setEditForm({
      name: student.name || "",
      email: student.email || "",
      studentId: student.studentId || "",
      phone: student.phone || ""
    });
    setEditModalOpen(true);
    setError("");
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingId(null);
    setEditForm({
      name: "",
      email: "",
      studentId: "",
      phone: ""
    });
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!roleConfig.canEdit) return;
    
    try {
      if (!editForm.name.trim() || !editForm.email.trim()) {
        setError("Name and email are required");
        return;
      }

      // Use appropriate API based on role
      switch (userRole) {
        case "admin":
          await adminAPI.students.update(editingId, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
        case "hod":
          await hodAPI.students.update(editingId, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
        case "teacher":
          await teacherAPI.students.update(editingId, {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            studentId: editForm.studentId.trim() || undefined,
            phone: editForm.phone.trim() || undefined,
          });
          break;
      }

      setError("");
      setEditModalOpen(false);
      setEditingId(null);
      await fetchStudents();
      setSuccessMessage("Student updated successfully!");
    } catch (err) {
      console.error("Failed to update student:", err);
      setError(err.response?.data?.error || "Failed to update student");
      showError(err.response?.data?.error || "Failed to update student");
    }

    setEditForm({
      name: "",
      email: "",
      studentId: "",
      phone: ""
    });
    setError("");
  };

  // Delete handlers
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!roleConfig.canDelete) return;
    
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    setDeleteLoading(true);
    try {
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
      }
      
      setError("");
      setSuccessMessage(`Student "${studentName}" deleted successfully!`);
      
      // Refresh the students list
      await fetchStudents();
    } catch (err) {
      console.error("Failed to delete student:", err);
      const errorMessage = err.response?.data?.error || "Failed to delete student";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Refresh students based on role
  const fetchStudents = async () => {
    switch (userRole) {
      case "admin":
        await fetchAdminStudents();
        break;
      case "hod":
        await fetchHODStudents();
        break;
      case "teacher":
        await fetchTeacherStudents();
        break;
    }
  };

  // Render grouped students for admin and HOD views
  const renderGroupedStudents = () => {
    if (!isGrouped) return null;

    if (groupType === 'admin') {
      // Admin: Department → Class → Students
      return (
        <div className="space-y-6">
          {Object.entries(studentData).map(([deptName, classes]) => (
            <div key={deptName} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">{deptName}</h3>
                <div className="text-sm text-gray-500">
                  {Object.values(classes).reduce((total, classStudents) => total + classStudents.length, 0)} students
                </div>
              </div>
              
              <div className="space-y-4">
                {Object.entries(classes).map(([className, classStudents]) => (
                  <div key={className} className="ml-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h4 className="text-md font-semibold text-gray-800">{className}</h4>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {classStudents.length} students
                      </div>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      {classStudents.map((student) => renderStudentCard(student))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (groupType === 'hod' || userRole === 'hod') {
      // HOD: Class → Students (within their department)
      const classEntries = Object.entries(studentData);
      
      if (classEntries.length === 0) {
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 lg:p-16">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">?</div>
              <p className="text-gray-500 text-base sm:text-lg">
                No students found in your department
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try registering students for your department
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-4">
          {classEntries.map(([className, classStudents]) => (
            <div key={className} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">{className}</h3>
                <div className="text-sm text-gray-500">
                  {classStudents.length} students
                </div>
              </div>
              
              <div className="space-y-2">
                {classStudents.map((student) => renderStudentCard(student))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  // Render student card
  const renderStudentCard = (student) => {
    return (
      <div
        key={student._id}
        className={`${userRole === "admin" ? "bg-blue-50 hover:bg-blue-100 border border-blue-200" : "bg-gray-50 hover:bg-gray-100"} rounded-xl p-4 sm:p-6 transition-colors`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{student.name}</h3>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-600 truncate">
                📧 {student.email}
              </p>
              <p className="text-sm text-gray-600">
                🆔 {student.studentId || "N/A"}
              </p>
              {student.phone && (
                <p className="text-sm text-gray-600">
                  📱 {student.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {roleConfig.canEdit && (
              <button
                onClick={() => handleEdit(student)}
                className="px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Edit
              </button>
            )}
            
            {roleConfig.canDelete && (
              <button
                onClick={() => handleDeleteStudent(student._id, student.name)}
                disabled={deleteLoading}
                className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deleteLoading ? "..." : "🗑️"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render class information
  const renderClassInfo = () => {
    if (!roleConfig.showClassInfo || !classData) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
        <div className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Class Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
            <span className="text-sm font-medium">{classData.name}</span>
          </div>
          {classData.year && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Year:</span>
              <span className="text-sm font-medium">{classData.year}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Department:</span>
            <span className="text-sm font-medium">{classData.department?.name}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render department information
  const renderDepartmentInfo = () => {
    if (!roleConfig.showDepartmentInfo || !department) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
        <div className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Department Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Department:</span>
            <span className="text-sm font-medium">{department.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Students:</span>
            <span className="text-sm font-medium">{students.length}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminMobileShell title={roleConfig.title} subtitle="Loading...">
        <div className="space-y-4 sm:space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 animate-pulse"
            >
              <div className="h-6 sm:h-8 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
              <div className="h-4 sm:h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell
      title={roleConfig.title}
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
      backTo={`/${userRole}/dashboard`}
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

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
        <input
          type="text"
          placeholder="Search students by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-base w-full text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
        />
        <p className="text-base sm:text-lg text-gray-600 mt-3">
          {filteredStudents.length} of {students.length} students
        </p>
      </div>

      {/* Class Information (Teacher Only) */}
      {renderClassInfo()}

      {/* Department Information (HOD Only) */}
      {renderDepartmentInfo()}

      {/* Students List */}
      {(userRole === "admin" || userRole === "hod") ? (
        // Admin and HOD get grouped view
        filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 lg:p-16">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">?</div>
              <p className="text-gray-500 text-base sm:text-lg">
                {searchTerm ? "No students found matching your search" : 
                 userRole === "admin" ? "No students registered yet" :
                 "No students in your department yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? "Try a different search term" : "Register students to get started"}
              </p>
            </div>
          </div>
        ) : (
          renderGroupedStudents()
        )
      ) : (
        // Teacher gets regular list view
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="text-lg sm:text-xl font-bold text-gray-900">{roleConfig.studentType}</div>
            <div className="text-sm font-semibold text-gray-500">{filteredStudents.length} FOUND</div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="text-4xl mb-2 animate-bounce">?</div>
              <p className="text-gray-500 text-sm">
                {searchTerm ? "No students found matching your search" : "No students in your class yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? "Try a different search term" : "Register students to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => (
                <div key={student._id} className="animate-fadeInUp" style={{ animationDelay: `${index * 50}ms` }}>
                  {renderStudentCard(student)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Edit Student Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-white flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative border border-gray-200 shadow-xl">
            {/* Close Button */}
            <button
              onClick={handleCloseEditModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Student</h2>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
                {error}
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
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter student's full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="student@college.edu"
                />
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  value={editForm.studentId}
                  onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter official student ID"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (10 digits)
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => {
                    // Only allow digits, limit to 10
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditForm({ ...editForm, phone: value });
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234567890"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">Please enter exactly 10 digits</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
