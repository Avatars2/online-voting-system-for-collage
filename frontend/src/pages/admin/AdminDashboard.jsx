import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { StatCard, ElectionCard } from "../../components/UI/EnhancedCard";
import { useToast } from "../../components/UI/Toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState({ deptCount: 0, studentCount: 0, activeElections: 0 });
  const [loading, setLoading] = useState(true);
  const [recentElections, setRecentElections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, electionsRes] = await Promise.all([
          adminAPI.stats(),
          adminAPI.elections.list()
        ]);
        
        setStats(statsRes.data || { deptCount: 0, studentCount: 0, activeElections: 0 });
        setRecentElections((electionsRes.data || []).slice(0, 3));
      } catch (err) {
        showError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getElectionStatus = (election) => {
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    
    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Closed';
    return 'Active';
  };

  const handleElectionClick = (election) => {
    const status = getElectionStatus(election);
    if (status === 'Active') {
      navigate(`/admin/results/detail?electionId=${election._id}`);
    } else {
      navigate(`/admin/elections`);
    }
  };

  if (loading) {
    return (
      <AdminMobileShell title="Admin Dashboard" subtitle="Loading...">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center shadow-sm animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Admin Dashboard" subtitle="System Overview">
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            title="Departments" 
            value={stats.deptCount} 
            icon="🏢" 
            color="blue"
          />
          <StatCard 
            title="Students" 
            value={stats.studentCount} 
            icon="👥" 
            color="green"
          />
          <StatCard 
            title="Active Elections" 
            value={stats.activeElections} 
            icon="🗳️" 
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/admin/notices")}
              className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📢</span>
              <span className="text-xs font-medium text-gray-700">Notices</span>
            </button>
            <button
              onClick={() => navigate("/admin/departments")}
              className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">🏢</span>
              <span className="text-xs font-medium text-gray-700">Departments</span>
            </button>
            <button
              onClick={() => navigate("/admin/elections")}
              className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">🗳️</span>
              <span className="text-xs font-medium text-gray-700">Elections</span>
            </button>
            <button
              onClick={() => navigate("/admin/results")}
              className="p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📊</span>
              <span className="text-xs font-medium text-gray-700">Results</span>
            </button>
          </div>
        </div>

        {/* Recent Elections */}
        {recentElections.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-gray-600 uppercase">Recent Elections</div>
              <button
                onClick={() => navigate("/admin/elections")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {recentElections.map((election) => (
                <ElectionCard
                  key={election._id}
                  election={election}
                  onClick={() => handleElectionClick(election)}
                  status={getElectionStatus(election)}
                />
              ))}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4">
          <div className="text-sm font-bold text-blue-800 uppercase mb-2">System Status</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">API Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Database OK</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Auth Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">All Systems Go</span>
            </div>
          </div>
        </div>
      </div>
    </AdminMobileShell>
  );
}
