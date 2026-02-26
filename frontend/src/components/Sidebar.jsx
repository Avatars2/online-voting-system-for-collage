import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };
  const closeSidebar = () => setIsOpen(false);

  const menuItems = [
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "Profile", path: "/admin/profile" },
    { label: "Reset Password", path: "/admin/reset-password" },
    { label: "Notice", path: "/admin/notices" },
    { label: "Department", path: "/admin/departments" },
    { label: "Election", path: "/admin/elections" },
    { label: "Result", path: "/admin/results" },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg"
      >
        ☰
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 left-0 h-screen w-64 bg-gradient-to-b from-blue-600 to-blue-700 text-white p-4 transform transition-transform duration-300 z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Close button for mobile */}
        <button
          onClick={closeSidebar}
          className="md:hidden absolute top-4 right-4 text-white text-xl"
        >
          ✕
        </button>

        <div className="mt-6 md:mt-0">
          <h2 className="text-2xl font-bold mb-8">✓ Voting</h2>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className="block px-4 py-3 rounded-lg hover:bg-blue-500 active:bg-blue-800 transition-colors truncate"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <hr className="my-6 border-blue-500" />

          <button
            onClick={() => { closeSidebar(); handleLogout(); }}
            className="block w-full text-left px-4 py-3 rounded-lg hover:bg-red-500 active:bg-red-700 transition-colors text-red-100"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
}
