import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MENU = [
  { label: "Dashboard", path: "/student/dashboard", icon: "🏠" },
  { label: "Notices", path: "/student/notices", icon: "📢" },
  { label: "Elections", path: "/student/elections", icon: "🗳️" },
  { label: "Results", path: "/student/results", icon: "📊" },
  { label: "Profile", path: "/student/profile", icon: "👤" },
  { label: "Change Password", path: "/student/reset-password", icon: "🔒" },
];

export default function StudentMobileShell({
  title,
  subtitle,
  headerColor = "bg-gradient-to-r from-emerald-600 to-green-700",
  backTo,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024); // Initialize based on screen size
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024); // Desktop detection

  const activePath = useMemo(() => location.pathname, [location.pathname]);

  // Detect screen size and set desktop state
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024; // lg: breakpoint
      setIsDesktop(desktop);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set sidebar state based on screen size
  useEffect(() => {
    if (isDesktop && !sidebarOpen) {
      setSidebarOpen(true);
    } else if (!isDesktop && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isDesktop, sidebarOpen]);

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
      {/* Sidebar - Left Side Navigation */}
      <div className={`w-64 transition-all duration-300 bg-white/95 backdrop-blur shadow-2xl border-r border-white/30 ${isDesktop || sidebarOpen ? 'flex' : 'hidden'} flex-col`}>
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
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 relative overflow-hidden group ${
                  isActive 
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-[1.02]" 
                    : "hover:bg-gray-100 text-gray-800 hover:scale-[1.01] hover:shadow-md"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/80 rounded-r-full"></div>
                )}
                
                {/* Icon container with hover effect */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "bg-white/20" 
                    : "bg-gray-100 group-hover:bg-gray-200"
                }`}>
                  <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-gray-700"
                  }`}>{item.icon}</span>
                </div>
                
                {/* Text with hover effect */}
                <div className="flex-1 min-w-0">
                  <span className={`font-medium transition-all duration-200 ${
                    isActive ? "text-white" : "text-gray-800 group-hover:text-gray-900"
                  }`}>{item.label}</span>
                  
                  {/* Subtle underline on hover for non-active items */}
                  {!isActive && (
                    <div className="h-0.5 bg-gray-300 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full"></div>
                  )}
                </div>
                
                {/* Arrow indicator for active item */}
                {isActive && (
                  <div className="text-white/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-red-50 text-red-700 transition-all duration-200 relative overflow-hidden group hover:scale-[1.01] hover:shadow-md"
          >
            {/* Icon container with hover effect */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 group-hover:bg-red-200 transition-all duration-200">
              <svg className="w-5 h-5 text-red-600 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            
            {/* Text with hover effect */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-red-700 group-hover:text-red-800 transition-colors duration-200">Logout</span>
              
              {/* Subtle underline on hover */}
              <div className="h-0.5 bg-red-300 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full"></div>
            </div>
            
            {/* Arrow indicator on hover */}
            <div className="text-red-600 group-hover:translate-x-1 transition-transform duration-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-12 h-12 bg-white/95 backdrop-blur rounded-full shadow-lg flex items-center justify-center"
          >
            <span className="text-2xl">&equiv;</span>
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isDesktop && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl">
            <div className={`${headerColor} p-6`}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl font-bold">{userInitial}</span>
                </div>
                <h2 className="text-white font-bold text-lg">Student Menu</h2>
              </div>
            </div>

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
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

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
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
