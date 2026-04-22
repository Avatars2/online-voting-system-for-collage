import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MENU = [
  { label: "Dashboard", path: "/student/dashboard", icon: "Dashboard" },
  { label: "Profile", path: "/student/profile", icon: "Profile" },
  { label: "Change Password", path: "/student/reset-password", icon: "Lock" },
  { label: "Elections", path: "/student/elections", icon: "Vote" },
  { label: "Results", path: "/student/results", icon: "Results" },
  { label: "Notices", path: "/student/notices", icon: "Notices" },
];

export default function StudentMobileShell({
  title,
  subtitle,
  headerColor = "bg-gradient-to-r from-emerald-600 to-teal-600",
  backTo,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed for mobile
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024); // Desktop detection

  const activePath = useMemo(() => location.pathname, [location.pathname]);

  // Detect screen size and set desktop state
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024; // lg: breakpoint
      setIsDesktop(desktop);
      // Auto-close mobile menu when switching to desktop
      if (desktop) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const userInitial = useMemo(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.name?.charAt(0)?.toUpperCase() || "S";
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-green-700 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isDesktop && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            {/* Sidebar Header */}
            <div className={`${headerColor} p-6`}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl font-bold">{userInitial}</span>
                </div>
                <h2 className="text-white font-bold text-lg">Student Menu</h2>
              </div>
            </div>
            
            {/* Navigation Menu */}
            <div className="flex-1 p-4 space-y-2">
              {MENU.map((item) => {
                const isActive = activePath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg" 
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    {/* Icon */}
                    <span className={`text-xl ${
                      isActive ? "text-white" : "text-gray-700"
                    }`}>{item.icon}</span>
                    
                    {/* Text */}
                    <span className={`font-medium ${
                      isActive ? "text-white" : "text-gray-800"
                    }`}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-red-50 text-red-700 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium text-red-700">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => {
              console.log('Student hamburger clicked, current state:', sidebarOpen);
              setSidebarOpen(!sidebarOpen);
            }}
            className="w-12 h-12 bg-white/95 backdrop-blur rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">&#9776;</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className={`${headerColor} px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {backTo && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(backTo);
                  }}
                  className="text-white/95 font-semibold"
                  aria-label="Back"
                >
                  &larr;
                </button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">{title}</h1>
                {subtitle ? <p className="text-white/80 text-sm sm:text-base lg:text-lg">{subtitle}</p> : null}
              </div>
            </div>
            
            {/* Profile Button - Desktop Only */}
            <div className="hidden lg:block">
              <button
                onClick={() => navigate("/student/profile")}
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden flex items-center justify-center"
                aria-label="Profile"
                title="Profile"
              >
                <span className="text-white font-bold">{userInitial}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 xl:p-12 2xl:p-16 space-y-4 sm:space-y-6 lg:space-y-8 flex-1 overflow-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
