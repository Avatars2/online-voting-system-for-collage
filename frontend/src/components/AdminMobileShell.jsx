import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ADMIN_MENU = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "🏠" },
  { label: "Profile", path: "/admin/profile", icon: "👤" },
  { label: "Reset Password", path: "/admin/reset-password", icon: "🔒" },
  { label: "Notice", path: "/admin/notices", icon: "🔔" },
  { label: "Department", path: "/admin/departments", icon: "🏢" },
  { label: "Election", path: "/admin/elections", icon: "🗳️" },
  { label: "Result", path: "/admin/results", icon: "📊" },
];

const HOD_MENU = [
  { label: "Dashboard", path: "/hod/dashboard", icon: "🏠" },
  { label: "Profile", path: "/hod/profile", icon: "👤" },
  { label: "Reset Password", path: "/hod/reset-password", icon: "🔒" },
  { label: "Notice", path: "/hod/notices", icon: "🔔" },
  { label: "Election", path: "/hod/elections", icon: "🗳️" },
  { label: "Result", path: "/hod/results", icon: "📊" },
];

const TEACHER_MENU = [
  { label: "Dashboard", path: "/teacher/dashboard", icon: "🏠" },
  { label: "Profile", path: "/teacher/profile", icon: "👤" },
  { label: "Reset Password", path: "/teacher/reset-password", icon: "🔒" },
  { label: "Students", path: "/teacher/students", icon: "👥" },
  { label: "Elections", path: "/teacher/elections", icon: "🗳️" },
  { label: "Results", path: "/teacher/results", icon: "📊" },
  { label: "Notices", path: "/teacher/notices", icon: "🔔" },
];

export default function AdminMobileShell({
  title,
  subtitle,
  headerColor = "bg-gradient-to-r from-blue-600 to-indigo-600",
  backTo,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const activePath = useMemo(() => location.pathname, [location.pathname]);
  
  // Determine user role and menu
  const userRole = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role || "admin";
  }, []);
  
  const menuItems = useMemo(() => {
    if (userRole === "hod") return HOD_MENU;
    if (userRole === "teacher") return TEACHER_MENU;
    return ADMIN_MENU;
  }, [userRole]);
  
  const profilePath = useMemo(() => {
    if (userRole === "hod") return "/hod/profile";
    if (userRole === "teacher") return "/teacher/profile";
    return "/admin/profile";
  }, [userRole]);
  
  const menuTitle = useMemo(() => {
    if (userRole === "hod") return "HOD Menu";
    if (userRole === "teacher") return "Teacher Menu";
    return "Admin Menu";
  }, [userRole]);
  
  const userInitial = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (userRole === "hod") return user.name?.charAt(0)?.toUpperCase() || "H";
    if (userRole === "teacher") return user.name?.charAt(0)?.toUpperCase() || "T";
    return user.name?.charAt(0)?.toUpperCase() || "A";
  }, [userRole]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 p-3 sm:p-4 flex justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/30 flex flex-col h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)]">
          <div className={`${headerColor} px-4 py-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {backTo ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Back button clicked, navigating to:", backTo);
                      try {
                        navigate(backTo);
                      } catch (error) {
                        console.error("Navigation error:", error);
                      }
                    }}
                    className="text-white/95 font-semibold"
                    aria-label="Back"
                  >
                    ←
                  </button>
                ) : (
                  <button
                    onClick={() => setMenuOpen(true)}
                    className="text-white/95 font-semibold"
                    aria-label="Menu"
                  >
                    ☰
                  </button>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
                  {subtitle ? <p className="text-white/80 text-sm">{subtitle}</p> : null}
                </div>
              </div>
              <button
                onClick={() => navigate(profilePath)}
                className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden flex items-center justify-center"
                aria-label="Profile"
                title="Profile"
              >
                <span className="text-white font-bold">{userInitial}</span>
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-4 right-4 top-16 mx-auto max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="font-bold text-gray-900">{menuTitle}</div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2">
                  {menuItems.map((item) => {
                    const isActive = activePath === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(item.path);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                          isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-800"
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                  <div className="my-2 h-px bg-gray-200" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-red-50 text-red-700"
                  >
                    <span className="text-lg">🚪</span>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 space-y-4 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

