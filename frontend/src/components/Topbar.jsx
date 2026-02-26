import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Topbar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="flex justify-between items-center bg-white shadow-md px-4 py-3 md:py-4 sticky top-0 z-20">
      <h1 className="text-lg md:text-xl font-bold text-blue-600">Voting System</h1>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="focus:outline-none"
        >
          <img
            src="https://i.pravatar.cc/40"
            alt="Profile"
            className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
          />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg p-2 z-30">
            <button
              onClick={() => {
                navigate("/admin/profile");
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              👤 Profile
            </button>
            <button
              onClick={() => {
                navigate("/admin/reset-password");
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              🔑 Change Password
            </button>
            <hr className="my-2" />
            <button
              onClick={() => {
                setShowMenu(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded-lg transition"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
