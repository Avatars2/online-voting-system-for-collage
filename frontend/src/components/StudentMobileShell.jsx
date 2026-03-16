import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MENU = [
  { label: "Dashboard", path: "/student/dashboard", icon: "🏠" },
  { label: "Notices", path: "/student/notices", icon: "📢" },
  { label: "Elections", path: "/student/elections", icon: "🗳️" },
  { label: "Results", path: "/student/results", icon: "📊" },
  { label: "Profile", path: "/student/profile", icon: "👤" },
  { label: "Reset Password", path: "/student/reset-password", icon: "🔒" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  const activePath = useMemo(() => location.pathname, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-green-700 p-3 sm:p-4 flex justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/30 flex flex-col h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)]">
          <div className={`${headerColor} px-4 py-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {backTo ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Student back button clicked, navigating to:", backTo);
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
                onClick={() => navigate("/student/profile")}
                className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden flex items-center justify-center"
                aria-label="Profile"
                title="Profile"
              >
                <span className="text-white font-bold">S</span>
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
                  <div className="font-bold text-gray-900">Student Menu</div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2">
                  {MENU.map((item) => {
                    const isActive = activePath === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(item.path);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                          isActive ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50 text-gray-800"
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

