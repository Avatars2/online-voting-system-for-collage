import SmallCard from "../../components/SmallCard";
import { useNavigate } from "react-router-dom";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentDashboard(){
  const navigate = useNavigate();

  return(
    <StudentMobileShell title="OVS Student" subtitle="Quick actions">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Dashboard</div>
        <div className="grid grid-cols-2 gap-4">
          <SmallCard title="Notices" icon="📢" onClick={() => navigate("/student/notices")} />
          <SmallCard title="Elections" icon="🗳️" onClick={() => navigate("/student/elections")} />
          <SmallCard title="Results" icon="📊" onClick={() => navigate("/student/results")} />
          <SmallCard title="Profile" icon="👤" onClick={() => navigate("/student/profile")} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Quick Actions</div>
        <div className="space-y-2">
          <button 
            onClick={() => navigate("/student/profile")} 
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
          >
            <span className="text-xl">👤</span>
            <div>
              <p className="font-semibold">My Profile</p>
              <p className="text-xs text-gray-500">View and edit profile</p>
            </div>
          </button>
          <button 
            onClick={() => navigate("/student/reset-password")} 
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
          >
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold">Reset Password</p>
              <p className="text-xs text-gray-500">Change password</p>
            </div>
          </button>
          <button 
            onClick={() => navigate("/student/notices")} 
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
          >
            <span className="text-xl">📢</span>
            <div>
              <p className="font-semibold">View Notices</p>
              <p className="text-xs text-gray-500">Latest announcements</p>
            </div>
          </button>
          <button 
            onClick={() => navigate("/student/elections")} 
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
          >
            <span className="text-xl">🗳️</span>
            <div>
              <p className="font-semibold">Active Elections</p>
              <p className="text-xs text-gray-500">Cast your vote</p>
            </div>
          </button>
          <button 
            onClick={() => navigate("/student/results")} 
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left"
          >
            <span className="text-xl">📊</span>
            <div>
              <p className="font-semibold">Election Results</p>
              <p className="text-xs text-gray-500">View outcomes</p>
            </div>
          </button>
        </div>
      </div>
    </StudentMobileShell>
  )
}
