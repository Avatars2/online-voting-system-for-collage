import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, studentAPI, noticesAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { StatCard, ElectionCard } from "../../components/UI/EnhancedCard";
import { useToast } from "../../components/UI/Toast";

export default function UnifiedDashboardPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard data states
  const [stats, setStats] = useState({});
  const [recentElections, setRecentElections] = useState([]);
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [teacherClass, setTeacherClass] = useState(null);

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Election status helper
  const getElectionStatus = (election) => {
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    
    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Closed';
    return 'Active';
  };

  // Fetch dashboard data based on role
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userRole) return;

      setLoading(true);
      setError("");
      
      try {
        switch (userRole) {
          case "admin":
            await fetchAdminDashboard();
            break;
          case "hod":
            await fetchHODDashboard();
            break;
          case "teacher":
            await fetchTeacherDashboard();
            break;
          case "student":
            await fetchStudentDashboard();
            break;
          default:
            throw new Error("Invalid role");
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err.response?.data?.error || "Failed to load dashboard data");
        showError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up real-time refresh for student dashboard (every 2 minutes instead of 30 seconds to reduce rate limiting)
    if (userRole === "student") {
      const interval = setInterval(fetchDashboardData, 120000); // 2 minutes (120,000 ms) instead of 30 seconds
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const fetchAdminDashboard = async () => {
    const [statsRes, electionsRes] = await Promise.all([
      adminAPI.getDashboardStats(),
      adminAPI.elections.list()
    ]);
    
    setStats(statsRes.data || { deptCount: 0, studentCount: 0, activeElections: 0 });
    setRecentElections((electionsRes.data || []).slice(0, 3));
  };

  const fetchHODDashboard = async () => {
    const [userResponse, deptsResponse, electionsResponse, studentsResponse] = await Promise.all([
      authAPI.verifyToken(),
      hodAPI.getDepartment(),
      hodAPI.elections.list(),
      hodAPI.students.list()
    ]);
    
    const user = userResponse.data;
    const departments = deptsResponse.data || [];
    const elections = electionsResponse.data || [];
    const students = studentsResponse.data || [];
    
    // Calculate HOD-specific stats
    const now = new Date();
    const activeElections = elections.filter(election => {
      const start = election.startDate ? new Date(election.startDate) : null;
      const end = election.endDate ? new Date(election.endDate) : null;
      
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });
    
    const upcomingElections = elections.filter(election => {
      const start = election.startDate ? new Date(election.startDate) : null;
      if (start && now < start) return true;
      return false;
    });
    
    setStats({
      studentCount: students.length,
      activeElections: activeElections.length,
      upcomingElections: upcomingElections.length
    });
    
    // Show recent elections (active ones first, then recent)
    const sortedElections = [
      ...activeElections,
      ...elections.filter(e => !activeElections.includes(e))
    ].slice(0, 3);
    
    setRecentElections(sortedElections);
    setUser(user);
    setDepartments(departments);
  };

  const fetchTeacherDashboard = async () => {
    // Get user data first
    const userResponse = await authAPI.verifyToken();
    const userData = userResponse.data.user || userResponse.data;
    setUser(userData);
    
    // Get teacher dashboard data
    try {
      const dashboardResponse = await teacherAPI.getDashboard();
      const { class: classData, students, stats: dashboardStats } = dashboardResponse.data;
      
      // Initialize stats with default values
      let activeElections = 0;
      let upcomingElections = 0;
      
      // Try to get elections data separately (don't let it break the dashboard)
      try {
        const electionsResponse = await teacherAPI.elections();
        const elections = electionsResponse.data || [];
        
        // Calculate election stats for teacher
        const now = new Date();
        const activeElectionsList = elections.filter(election => {
          const start = election.startDate ? new Date(election.startDate) : null;
          const end = election.endDate ? new Date(election.endDate) : null;
          
          // More flexible active election logic
          if (!start && !end) return true;
          if (start && now < start) return false;
          if (end && now > end) return false;
          return true;
        });
        
        const upcomingElectionsList = elections.filter(election => {
          const start = election.startDate ? new Date(election.startDate) : null;
          if (start && now < start) return true;
          return false;
        });
        
        activeElections = activeElectionsList.length;
        upcomingElections = upcomingElectionsList.length;
      } catch (electionsError) {
        console.log("Elections data not available, using defaults:", electionsError.message);
        // Keep default values (0) if elections API fails
      }
      
      if (classData) {
        setTeacherClass(classData);
        setStats({
          studentCount: dashboardStats?.totalStudents || students?.length || 0,
          activeElections: activeElections,
          upcomingElections: upcomingElections,
          totalNotices: 0
        });
      } else {
        setError("No class assigned to this teacher");
      }
    } catch (dashboardError) {
      console.error("Dashboard fetch error:", dashboardError);
      setError("Failed to load class information");
    }
  };

  const fetchStudentDashboard = async () => {
    const [noticesRes, electionsRes, studentRes] = await Promise.all([
      noticesAPI.list(),
      studentAPI.elections(),
      studentAPI.me()
    ]);
    
    const student = studentRes.data;
    const elections = electionsRes.data || [];
    const notices = noticesRes.data || [];
    
    // Calculate stats based on real data
    const activeElections = elections.filter(election => {
      const now = new Date();
      const start = election.startDate ? new Date(election.startDate) : null;
      const end = election.endDate ? new Date(election.endDate) : null;
      
      // Debug logging
      console.log('Election:', election.title, {
        start: election.startDate,
        end: election.endDate,
        now: now.toISOString(),
        startValid: start && now >= start,
        endValid: end && now <= end
      });
      
      // More flexible active election logic
      // If no dates specified, consider it active
      if (!start && !end) return true;
      
      // If start date exists, election must have started
      if (start && now < start) return false;
      
      // If end date exists, election must not have ended
      if (end && now > end) return false;
      
      return true;
    });
    
    const upcomingElections = elections.filter(election => {
      const now = new Date();
      const start = election.startDate ? new Date(election.startDate) : null;
      
      // Only include elections that haven't started yet
      if (start && now < start) return true;
      return false;
    });
    
    const votedElections = student?.votedElections || [];
    
    setStats({ 
      activeElections: activeElections.length,
      upcomingElections: upcomingElections.length,
      votedCount: votedElections.length
    });
    
    // Show recent elections (active ones first, then upcoming, then others)
    const sortedElections = [
      ...activeElections,
      ...upcomingElections,
      ...elections.filter(e => !activeElections.includes(e) && !upcomingElections.includes(e))
    ].slice(0, 3);
    
    setRecentElections(sortedElections);
  };

  // Get role-specific configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Admin Dashboard",
          subtitle: "System Overview",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          stats: [
            { title: "Departments", value: stats.deptCount, icon: "🏢", color: "blue" },
            { title: "Students", value: stats.studentCount, icon: "👥", color: "green" },
            { title: "Active Elections", value: stats.activeElections, icon: "🗳️", color: "purple" }
          ],
          quickActions: [
            { icon: "📢", label: "Notices", path: "/admin/notices", color: "blue" },
            { icon: "👥", label: "Students", path: "/admin/students", color: "indigo" },
            { icon: "🏢", label: "Departments", path: "/admin/departments", color: "green" },
            { icon: "🗳️", label: "Elections", path: "/admin/elections", color: "purple" },
            { icon: "📊", label: "Results", path: "/admin/results", color: "orange" }
          ]
        };
      case "hod":
        return {
          title: "HOD Dashboard",
          subtitle: `${departments.length} Department${departments.length !== 1 ? 's' : ''} Assigned to You`,
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          stats: [
            { title: "Upcoming Elections", value: stats.upcomingElections, icon: "📅", color: "blue" },
            { title: "Active Elections", value: stats.activeElections, icon: "🗳️", color: "green" },
            { title: "Students", value: stats.studentCount, icon: "👥", color: "purple" }
          ],
          quickActions: [
            { icon: "📢", label: "Notices", path: "/hod/notices", color: "blue" },
            { icon: "🗳️", label: "Elections", path: "/hod/elections", color: "purple" },
            { icon: "👥", label: "Students", path: "/hod/students", color: "indigo" },
            { icon: "📊", label: "Results", path: "/hod/results", color: "orange" }
          ]
        };
      case "teacher":
        return {
          title: "Teacher Dashboard",
          subtitle: teacherClass ? `${teacherClass.name} - ${teacherClass.year || ''}` : "Class Overview",
          headerColor: "bg-gradient-to-r from-purple-600 to-pink-700",
          stats: [
            { title: "Upcoming Elections", value: stats.upcomingElections, icon: "📅", color: "blue" },
            { title: "Active Elections", value: stats.activeElections, icon: "🗳️", color: "green" },
            { title: "Students", value: stats.studentCount, icon: "👥", color: "purple" }
          ],
          quickActions: [
            { icon: "📢", label: "Notices", path: "/teacher/notices", color: "blue" },
            { icon: "🗳️", label: "Elections", path: "/teacher/elections", color: "purple" },
            { icon: "👥", label: "Students", path: "/teacher/students", color: "green" },
            { icon: "📊", label: "Results", path: "/teacher/results", color: "orange" }
          ]
        };
      case "student":
        return {
          title: "Student Dashboard",
          subtitle: "Student Overview",
          headerColor: undefined, // Student uses default
          stats: [
            { title: "Upcoming Elections", value: stats.upcomingElections, icon: "📅", color: "blue" },
            { title: "Active Elections", value: stats.activeElections, icon: "🗳️", color: "green" },
            { title: "Voted", value: stats.votedCount, icon: "✅", color: "purple" }
          ],
          quickActions: [
            { icon: "📢", label: "Notices", path: "/student/notices", color: "blue" },
            { icon: "🗳️", label: "Elections", path: "/student/elections", color: "green" },
            { icon: "📊", label: "Results", path: "/student/results", color: "purple" },
            { icon: "👤", label: "Profile", path: "/student/profile", color: "orange" }
          ]
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Overview",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          stats: [],
          quickActions: []
        };
    }
  };

  const roleConfig = getRoleConfig();
  const ShellComponent = AdminMobileShell;

  // Handle election clicks based on role
  const handleElectionClick = (election) => {
    const status = getElectionStatus(election);
    const basePath = `/${userRole}`;
    
    if (userRole === "student") {
      if (status === 'Closed') {
        navigate(`/student/results/detail?electionId=${election._id}`);
      } else {
        navigate(`${basePath}/elections`);
      }
    } else {
      if (status === 'Active') {
        navigate(`${basePath}/results/detail?electionId=${election._id}`);
      } else {
        navigate(`${basePath}/elections`);
      }
    }
  };

  // Handle department/class clicks
  const handleDepartmentClick = (department) => {
    navigate(`/departments/${department._id}`);
  };

  const handleClassClick = () => {
    if (teacherClass) {
      navigate(`/teacher/class/${teacherClass._id}`);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <ShellComponent title={roleConfig.title} subtitle="Loading...">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-6 sm:p-8 text-center shadow-sm animate-pulse">
                <div className="h-12 sm:h-16 bg-gray-200 rounded w-16 sm:w-20 mx-auto mb-3 sm:mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-20 sm:w-24 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 animate-pulse">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
                <div className="h-4 sm:h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </ShellComponent>
    );
  }

  return (
    <ShellComponent 
      title={roleConfig.title} 
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards - Only for roles that have them */}
      {roleConfig.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {roleConfig.stats.map((stat, index) => (
            <div 
              key={index}
              className="animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <StatCard 
                title={stat.title} 
                value={stat.value} 
                icon={stat.icon} 
                color={stat.color}
              />
            </div>
          ))}
        </div>
      )}

      {/* Role-specific content */}
      {userRole === "hod" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="text-lg sm:text-xl font-bold text-gray-900">Your Departments</div>
            <div className="text-xs font-semibold text-gray-500">{departments.length} TOTAL</div>
          </div>
          
          {departments.length === 0 ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="text-gray-500 mb-4">
                <div className="text-4xl mb-2 animate-bounce">?</div>
                <p className="text-lg font-medium">No Departments Assigned</p>
                <p className="text-sm">You are not registered as HOD for any department yet.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((department, index) => (
                <div 
                  key={department._id}
                  className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md animate-fadeInUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleDepartmentClick(department)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{department.name}</h3>
                      <div className="flex items-center mt-1 space-x-4">
                        <span className="text-xs text-green-600 font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDepartmentClick(department);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                      >
                        View →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {userRole === "teacher" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-gray-900">Your Class</div>
            <div className="text-xs font-semibold text-gray-500">{teacherClass ? '1 TOTAL' : '0 TOTAL'}</div>
          </div>
          
          {!teacherClass ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <div className="text-4xl mb-2">🏫</div>
                <p className="text-lg font-medium">No Class Assigned</p>
                <p className="text-sm">You are not assigned to any class yet.</p>
              </div>
            </div>
          ) : (
            <div 
              className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={handleClassClick}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{teacherClass.name}</h3>
                  <div className="flex items-center mt-1 space-x-4">
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                    {teacherClass.year && (
                      <span className="text-xs text-blue-600 font-medium">
                        {teacherClass.year}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="text-xs text-gray-600">
                      Department: {teacherClass.department?.name || "Loading..."}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClassClick();
                    }}
                    className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                  >
                    View →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3 sm:mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {roleConfig.quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className={`p-4 sm:p-6 lg:p-8 bg-${action.color}-50 hover:bg-${action.color}-100 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg text-center`}
            >
              <span className="text-3xl sm:text-4xl lg:text-5xl block mb-2 sm:mb-3 lg:mb-4">{action.icon}</span>
              <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Elections - Only for teacher */}
      {recentElections.length > 0 && userRole === "teacher" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-600 uppercase">Recent Elections</div>
            <button
              onClick={() => navigate(`/${userRole}/elections`)}
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
    </ShellComponent>
  );
}
