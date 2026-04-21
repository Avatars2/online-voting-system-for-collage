import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, studentAPI, noticesAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import StudentMobileShell from "../../components/StudentMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function UnifiedNoticePage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [userRole, setUserRole] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  
  // Role-specific data
  const [department, setDepartment] = useState(null);
  const [classData, setClassData] = useState(null);
  const [user, setUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Get current user role and data
  useEffect(() => {
    const role = localStorage.getItem("role");
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(role);
    setUser(userData);
  }, []);

  // Role-based API configuration
  const getRoleAPI = () => {
    switch (userRole) {
      case "admin": return adminAPI;
      case "hod": return hodAPI;
      case "teacher": return teacherAPI;
      case "student": return studentAPI;
      default: return null;
    }
  };

  // Role-based navigation
  const getBackPath = () => {
    switch (userRole) {
      case "admin": return "/admin/dashboard";
      case "hod": return "/hod/dashboard";
      case "teacher": return "/teacher/dashboard";
      case "student": return "/student/dashboard";
      default: return "/";
    }
  };

  // Role-specific data fetching
  const fetchRoleSpecificData = async () => {
    const api = getRoleAPI();
    if (!api) return;

    try {
      setLoading(true);
      setError("");

      // Fetch notices based on role
      let noticesPromise;
      if (userRole === "student") {
        // Students use the general notices API which now has proper role-based filtering
        noticesPromise = noticesAPI.list(); // Use general notices API for students
      } else if (userRole === "teacher") {
        // Teachers should see only their class notices
        noticesPromise = api.notices.list(); // Use teacher-specific API
      } else if (api.notices && api.notices.list) {
        noticesPromise = api.notices.list(); // admin and hod use their specific APIs
      } else {
        noticesPromise = Promise.resolve({ data: [] });
      }
      
      // Fetch role-specific additional data
      let additionalDataPromise = Promise.resolve(null);
      
      if (userRole === "hod" && api.getDepartment) {
        additionalDataPromise = api.getDepartment();
      } else if (userRole === "teacher" && api.profile) {
        additionalDataPromise = api.profile();
      }

      const [noticesResponse, additionalResponse] = await Promise.all([
        noticesPromise,
        additionalDataPromise
      ]);

      setNotices(noticesResponse.data || []);

      // Set role-specific data
      if (userRole === "hod" && additionalResponse?.data) {
        setDepartment(additionalResponse.data?.[0] || null);
      } else if (userRole === "teacher" && additionalResponse?.data) {
        const userData = additionalResponse.data?.user || additionalResponse.data || null;
        setUser(userData);
        
        if (userData?.assignedClass) {
          const classId = typeof userData.assignedClass === 'object' ? 
            userData.assignedClass._id || userData.assignedClass.toString() : 
            userData.assignedClass;
          
          if (api.getClass) {
            const classResponse = await api.getClass(classId);
            if (classResponse.data) {
              setClassData(classResponse.data);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err.response?.data?.error || "Failed to load notices");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchRoleSpecificData();
    }
  }, [userRole]);

  // File upload handler (same for all roles that can publish)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are allowed");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setPdfFile(file);
    setError("");
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    setUploading(true);
    try {
      const uploadUrl = 'http://localhost:5001/api/notices/upload';
      const token = localStorage.getItem("token");
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      if (response.ok) {
        setPdfUrl(data.url);
        setError("");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      if (err.response) {
        setError(err.response.data?.error || "Upload failed");
      } else if (err.message) {
        setError("Network error - please check your connection");
      } else {
        setError("Upload failed - please try again");
      }
    } finally {
      setUploading(false);
    }
  };

  // Publish notice handler
  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Notice title is required");
      return;
    }
    
    const api = getRoleAPI();
    if (!api || !api.notices || !api.notices.create) {
      setError("You don't have permission to publish notices");
      return;
    }

    setPublishing(true);
    setError("");
    try {
      const noticeData = {
        title: title.trim(), 
        body: body.trim(),
        attachment: pdfUrl
      };
      
      await api.notices.create(noticeData);
      
      setSuccessMessage("Notice published successfully!");
      setTitle("");
      setBody("");
      setPdfFile(null);
      setPdfUrl("");
      fetchRoleSpecificData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  // Format time helper
  const formatTime = (d) => {
    if (!d) return "";
    const diff = (Date.now() - new Date(d)) / 3600000;
    if (diff < 1) return `${Math.round(diff * 60)}m ago`;
    if (diff < 24) return `${Math.round(diff)}h ago`;
    return `${Math.round(diff / 24)}d ago`;
  };

  // Get role-specific header configuration
  const getHeaderConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Notice Board",
          subtitle: "Broadcast to all students",
          headerColor: "bg-gradient-to-r from-rose-600 to-red-600"
        };
      case "hod":
        return {
          title: `${department?.name || "Department"} Notice Board`,
          subtitle: `Broadcast to ${department?.name || "department"} students`,
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700"
        };
      case "teacher":
        return {
          title: "Notice Board",
          subtitle: classData ? `Broadcast to ${classData.name} students` : "Broadcast to your class students",
          headerColor: "bg-gradient-to-r from-purple-600 to-pink-600"
        };
      case "student":
        return {
          title: "Notices",
          subtitle: "Announcements & updates"
        };
      default:
        return {
          title: "Notices",
          subtitle: "Announcements & updates"
        };
    }
  };

  // Check if user can publish notices
  const canPublish = ["admin", "hod", "teacher"].includes(userRole);

  const headerConfig = getHeaderConfig();

  // Choose shell component based on role
  const ShellComponent = userRole === "student" ? StudentMobileShell : AdminMobileShell;

  return (
    <ShellComponent
      title={headerConfig.title}
      subtitle={headerConfig.subtitle}
      headerColor={headerConfig.headerColor}
      backTo={getBackPath()}
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

      {/* Publish Section - Only for roles that can create notices */}
      {canPublish && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Draft New Notice</div>
          <div className="space-y-4 sm:space-y-6">
            <input
              type="text"
              placeholder={`Notice Title (e.g. ${userRole === 'teacher' ? 'Class Test Alert' : 'Holiday Alert'})`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
            />
            <textarea
              placeholder="Write your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="input-base h-32 sm:h-40 resize-none text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
            />
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 lg:p-10 hover:border-gray-400 transition-colors">
              <label className="block cursor-pointer">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">??</div>
                  <div className="text-base sm:text-lg text-gray-600 mb-3">
                    {uploading ? "Uploading..." : pdfFile ? pdfFile.name : "Click to upload PDF (optional)"}
                  </div>
                  <div className="text-sm text-gray-500">Max size: 10MB</div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              </label>
            </div>
            
            <button 
              onClick={handlePublish} 
              disabled={publishing || uploading} 
              className="btn-primary w-full text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-8 hover:scale-[1.02] transition-transform"
            >
              {publishing ? "Publishing..." : uploading ? "Uploading..." : "Publish Broadcast"}
            </button>
          </div>
        </div>
      )}

      {/* Notices Display Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 xl:p-12">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="text-lg sm:text-xl font-bold text-gray-900">
            {userRole === "student" ? "All Notices" : userRole === "hod" ? "All Notices" : userRole === "teacher" ? "Class Notices" : "Live Notices"}
          </div>
          <span className={`px-3 py-2 rounded-full text-sm font-semibold ${
            userRole === "admin" ? "bg-red-50 text-red-700" :
            userRole === "hod" ? "bg-green-50 text-green-700" :
            userRole === "teacher" ? "bg-purple-50 text-purple-700" :
            "bg-blue-50 text-blue-700"
          }`}>
            {notices.length} ACTIVE
          </span>
        </div>

        {/* Role-specific info message */}
        
        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Loading notices...</p>
        ) : notices.length === 0 ? (
          <div className="text-center py-8 animate-fadeIn">
            <div className="text-4xl mb-2 animate-bounce">?</div>
            <p className="text-gray-500 text-sm">No notices yet</p>
            {canPublish && (
              <p className="text-xs text-gray-400 mt-1">Create your first notice above</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {notices.map((n, index) => (
              <div key={n._id} className="p-6 sm:p-8 border rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-300 hover:scale-[1.01] hover:shadow-md animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{n.title}</h3>
                    <p className="text-base sm:text-lg text-gray-600 mt-2">{n.body || ""}</p>
                    {n.attachment && (
                      <div className="mt-2">
                        <a 
                          href={`http://localhost:5001${n.attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-base sm:text-lg font-medium"
                        >
                          📄 {n.attachment.split('/').pop()}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{formatTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ShellComponent>
  );
}
