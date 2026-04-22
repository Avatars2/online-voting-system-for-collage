import { useEffect, useMemo, useState } from "react";
import { authAPI, hodAPI, teacherAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function UnifiedProfilePage() {
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", avatarUrl: "" });
  
  // Role-specific data
  const [department, setDepartment] = useState(null);
  const [classData, setClassData] = useState(null);

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

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

  // Fetch profile data based on role
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userRole) return;

      setLoading(true);
      setError("");
      try {
        let userResponse;
        let additionalDataResponse = null;

        // Fetch user data based on role
        switch (userRole) {
          case "admin":
            userResponse = await authAPI.verifyToken();
            break;
          case "hod":
            [userResponse, additionalDataResponse] = await Promise.all([
              authAPI.verifyToken(),
              hodAPI.getDepartment()
            ]);
            setDepartment(additionalDataResponse?.data?.[0] || null);
            break;
          case "teacher":
            userResponse = await teacherAPI.profile();
            const user = userResponse.data?.user || userResponse.data || null;
            
            // Fetch class data if teacher has assigned class
            if (user?.assignedClass) {
              const classId = typeof user.assignedClass === 'object' ? 
                user.assignedClass._id || user.assignedClass.toString() : 
                user.assignedClass;
              
              try {
                const classResponse = await teacherAPI.getClass(classId);
                setClassData(classResponse?.data || null);
              } catch (err) {
                console.error("Failed to fetch class data:", err);
              }
            }
            break;
          case "student":
            userResponse = await authAPI.verifyToken();
            break;
          default:
            throw new Error("Invalid role");
        }

        const user = userResponse.data?.user || userResponse.data || null;
        setMe(user);
        setForm({
          name: user?.name || "",
          phone: user?.phone || "",
          avatarUrl: user?.avatarUrl || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userRole]);

  // Avatar source computation
  const avatarSrc = useMemo(() => {
    const displayName = form.name || me?.name || "User";
    
    // If user has uploaded a custom avatar, show that
    if (form.avatarUrl && form.avatarUrl.startsWith('data:')) {
      return form.avatarUrl;
    }
    
    // Otherwise, show generated avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=000000&size=150`;
  }, [form.name, form.avatarUrl, me?.name]);

  // Avatar file change handler
  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    const maxSizeBytes = 1024 * 1024 * 5; // 5MB
    if (file.size > maxSizeBytes) {
      setError("Image is too large. Please select a file under 5MB");
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, avatarUrl: result }));
        setSuccessMessage("");
      }
    };
    reader.readAsDataURL(file);
  };

  // Save profile handler
  const handleSave = async () => {
    setError("");
    setSuccessMessage("");
    
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    
    setSaving(true);
    try {
      const res = await authAPI.updateMe({
        name: form.name.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
      });
      
      const user = res.data?.user || res.data || null;
      setMe(user);
      setSuccessMessage("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Get role-specific configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "My Profile",
          subtitle: "Account information",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          roleTitle: "System Administrator",
          roleBadge: "SYSTEM SUPERUSER",
          badgeColor: "bg-emerald-50 text-emerald-700",
          ringColor: "ring-blue-100",
          checkColor: "bg-blue-600",
          fileColor: "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        };
      case "hod":
        return {
          title: "My Profile",
          subtitle: "HOD account information",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          roleTitle: "Head of Department",
          roleBadge: "HEAD OF DEPARTMENT",
          badgeColor: "bg-purple-50 text-purple-700",
          ringColor: "ring-green-100",
          checkColor: "bg-green-600",
          fileColor: "file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        };
      case "teacher":
        return {
          title: "My Profile",
          subtitle: "Account information",
          headerColor: "bg-gradient-to-r from-purple-600 to-pink-700",
          roleTitle: "Class Teacher",
          roleBadge: "TEACHER",
          badgeColor: "bg-purple-50 text-purple-700",
          ringColor: "ring-purple-100",
          checkColor: "bg-purple-600",
          fileColor: "file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        };
      case "student":
        return {
          title: "My Profile",
          subtitle: "Student account",
          roleTitle: "Student",
          roleBadge: "STUDENT",
          badgeColor: "bg-blue-50 text-blue-700",
          ringColor: "ring-emerald-100",
          checkColor: "bg-emerald-600",
          fileColor: "file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
        };
      default:
        return {
          title: "My Profile",
          subtitle: "Account information",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          roleTitle: "User",
          roleBadge: "USER",
          badgeColor: "bg-gray-50 text-gray-700",
          ringColor: "ring-gray-100",
          checkColor: "bg-gray-600",
          fileColor: "file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
        };
    }
  };

  const roleConfig = getRoleConfig();
  const ShellComponent = AdminMobileShell;

  // Render account information fields based on role
  const renderAccountInfo = () => {
    const fields = [];

    // Common fields for all roles
    fields.push(
      <div key="email" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
        <div className="text-sm text-gray-700">Email</div>
        <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
          {me?.email || "—"}
        </div>
      </div>
    );

    fields.push(
      <div key="phone" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
        <div className="text-sm text-gray-700">Phone</div>
        <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
          {me?.phone || "—"}
        </div>
      </div>
    );

    // Role-specific fields
    switch (userRole) {
      case "student":
        fields.push(
          <div key="enrollment" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-sm text-gray-700">Enrollment</div>
            <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
              {me?.studentId || "—"}
            </div>
          </div>
        );

        if (me?.department?.name || typeof me?.department === "string") {
          fields.push(
            <div key="department" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="text-sm text-gray-700">Department</div>
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {me?.department?.name || (typeof me?.department === "string" ? me.department : "") || "—"}
              </div>
            </div>
          );
        }

        if (me?.class?.name || typeof me?.class === "string") {
          fields.push(
            <div key="class" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="text-sm text-gray-700">Class</div>
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {me?.class?.name || (typeof me?.class === "string" ? me.class : "") || "—"}
              </div>
            </div>
          );
        }
        break;

      case "hod":
        if (department?.name) {
          fields.push(
            <div key="department" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="text-sm text-gray-700">Department</div>
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {department.name}
              </div>
            </div>
          );
        }
        break;

      case "teacher":
        if (classData?.department?.name) {
          fields.push(
            <div key="department" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="text-sm text-gray-700">Department</div>
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {classData.department.name}
              </div>
            </div>
          );
        }

        if (classData?.name) {
          fields.push(
            <div key="class" className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="text-sm text-gray-700">Class</div>
              <div className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">
                {classData.name}
              </div>
            </div>
          );
        }
        break;
    }

    return fields;
  };

  return (
    <ShellComponent
      title={roleConfig.title}
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
      backTo={getBackPath()}
    >
      {error && (
        <div className={`p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm ${
          userRole === "student" ? "" : "px-4"
        }`}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className={`p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm ${
          userRole === "student" ? "" : "px-4"
        }`}>
          ✓ {successMessage}
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${
        userRole === "student" ? "p-5" : ""
      }`}>
        <div className={`flex flex-col items-center text-center ${
          userRole === "student" ? "" : "p-5"
        }`}>
          <div className="relative">
            <img
              src={avatarSrc}
              alt={roleConfig.roleTitle}
              className={`w-24 h-24 rounded-full object-cover ring-4 ${roleConfig.ringColor}`}
              onError={(e) => {
                e.currentTarget.src = "https://i.pravatar.cc/150";
              }}
            />
            <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-full ${roleConfig.checkColor} text-white flex items-center justify-center text-xs font-bold`}>
              ✓
            </div>
          </div>
          
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {loading ? "Loading..." : form.name || roleConfig.roleTitle}
          </h2>
          
          <p className="text-sm text-gray-600">{roleConfig.roleTitle}</p>
          
          {/* Additional info for specific roles */}
          {userRole === "hod" && department?.name && (
            <p className="text-xs text-gray-500 mt-1">
              Department: {department.name}
            </p>
          )}
          
          {userRole === "student" && me?.class?.name && (
            <p className="text-sm text-gray-600">
              {me.class.name}
            </p>
          )}
          
          {userRole === "student" && me?.department?.name && (
            <p className="text-xs text-gray-500 mt-1">
              Department: {me.department.name}
            </p>
          )}
          
          <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full ${roleConfig.badgeColor} text-xs font-semibold`}>
            {roleConfig.roleBadge}
          </span>
        </div>

        <div className={`${userRole === "student" ? "mt-5" : "px-5 pb-5"} space-y-5`}>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Account Information</div>
            <div className="space-y-3">
              {renderAccountInfo()}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Edit Profile</div>
            <div className="space-y-3">
              <input
                className="input-base"
                placeholder={`${roleConfig.roleTitle} name`}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={loading || saving}
              />
              <input
                className="input-base"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={loading || saving}
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={loading || saving}
                className={`block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${roleConfig.fileColor}`}
              />
              <button 
                onClick={handleSave} 
                className="btn-primary w-full" 
                disabled={loading || saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ShellComponent>
  );
}
