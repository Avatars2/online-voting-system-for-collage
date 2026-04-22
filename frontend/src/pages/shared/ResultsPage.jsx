import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, studentAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function UnifiedResultsPage() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Data states
  const [elections, setElections] = useState([]);
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [department, setDepartment] = useState(null);

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

  // Fetch data based on role
  useEffect(() => {
    if (!userRole) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        switch (userRole) {
          case "admin":
            await fetchAdminResults();
            break;
          case "hod":
            await fetchHODResults();
            break;
          case "teacher":
            await fetchTeacherResults();
            break;
          case "student":
            await fetchStudentResults();
            break;
        }
      } catch (err) {
        console.error("Error fetching results:", err);
        setError(err.response?.data?.error || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole]);

  const fetchAdminResults = async () => {
    const res = await adminAPI.elections.list();
    setElections(res.data || []);
  };

  const fetchHODResults = async () => {
    const [userResponse, electionsResponse] = await Promise.all([
      authAPI.verifyToken(),
      hodAPI.elections.list()
    ]);
    
    const userData = userResponse.data;
    setUser(userData);
    
    // Get department info
    try {
      const deptResponse = await hodAPI.getDepartment();
      if (deptResponse.data && deptResponse.data.length > 0) {
        setDepartment(deptResponse.data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch department:", err);
    }
    
    setElections(electionsResponse.data || []);
  };

  const fetchTeacherResults = async () => {
    const userResponse = await teacherAPI.profile();
    const userData = userResponse.data?.user || userResponse.data || null;
    setUser(userData);

    if (userData?.assignedClass) {
      const classId = typeof userData.assignedClass === 'object' ? 
        userData.assignedClass._id || userData.assignedClass.toString() : 
        userData.assignedClass;
      
      const [classResponse, electionsResponse] = await Promise.all([
        teacherAPI.getClass(classId),
        teacherAPI.elections.list()
      ]);
      
      setClassData(classResponse.data);
      
      // Backend already filters elections by teacher's class in listElections API
      setElections(electionsResponse.data || []);
    } else {
      setError("No class assigned to teacher");
    }
  };

  const fetchStudentResults = async () => {
    const res = await studentAPI.elections();
    const allElections = res.data || [];
    
    // Filter to show only elections that have ended
    const now = new Date();
    const completedElections = allElections.filter(e => {
      const endDate = e.endDate ? new Date(e.endDate) : null;
      return endDate && endDate < now;
    });
    
    setElections(completedElections);
  };

  // Filter elections based on role and search
  const getFilteredElections = () => {
    let filtered = elections;

    // Apply search filter
    if (search) {
      filtered = filtered.filter((e) =>
        String(e.title || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    // Note: Backend already handles role-based filtering in listElections API
    // No need for additional department/class filtering here

    return filtered;
  };

  // Categorize elections by status
  const categorizeElections = () => {
    const filtered = getFilteredElections();
    const now = new Date();

    if (userRole === "student") {
      // Students only see completed elections
      return {
        completed: filtered,
        active: [],
        upcoming: []
      };
    }

    const completed = filtered.filter(e => {
      const endDate = e.endDate ? new Date(e.endDate) : null;
      return endDate && endDate < now;
    });

    const active = filtered.filter(e => {
      const start = e.startDate ? new Date(e.startDate) : null;
      const end = e.endDate ? new Date(e.endDate) : null;
      return start && end && start <= now && end >= now;
    });

    const upcoming = filtered.filter(e => {
      const start = e.startDate ? new Date(e.startDate) : null;
      return start && start > now;
    });

    return { completed, active, upcoming };
  };

  // Get role configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Election Results",
          subtitle: "Archive of completed polls",
          headerColor: "bg-gradient-to-r from-indigo-600 to-purple-700",
          showAllStatuses: false, // Only show completed
          showClassInfo: false
        };
      case "hod":
        return {
          title: "Election Results",
          subtitle: "Archive of completed polls",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          showAllStatuses: false, // Only show completed
          showClassInfo: false
        };
      case "teacher":
        return {
          title: "Election Results",
          subtitle: classData ? `${classData.name} Results Archive` : "Results Archive",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          showAllStatuses: true, // Show all statuses
          showClassInfo: true
        };
      case "student":
        return {
          title: "Election Results",
          subtitle: "Archive of completed polls",
          headerColor: undefined,
          showAllStatuses: false, // Only show completed
          showClassInfo: false
        };
      default:
        return {
          title: "Election Results",
          subtitle: "Archive of completed polls",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          showAllStatuses: false,
          showClassInfo: false
        };
    }
  };

  const roleConfig = getRoleConfig();
  const ShellComponent = AdminMobileShell;
  const { completed, active, upcoming } = categorizeElections();

  // Handle navigation to results detail
  const handleViewResults = (electionId) => {
    navigate(`/${userRole}/results/detail?electionId=${electionId}`);
  };

  // Render election card - updated to match elections page styling
  const renderElectionCard = (election, status) => {
    const statusConfig = {
      upcoming: { emoji: "📅", bg: "bg-orange-50", border: "border-orange-200", titleColor: "text-orange-900" },
      active: { emoji: "🚀", bg: "bg-green-50", border: "border-green-200", titleColor: "text-green-800" },
      completed: { emoji: "✅", bg: "bg-gray-50", border: "border-gray-200", titleColor: "text-gray-900" }
    };

    const config = statusConfig[status] || statusConfig.completed;
    const candidateCount = election.candidates?.length || 0;
    const isClickable = status === "completed" && (userRole === "student" || userRole === "admin" || userRole === "hod" || userRole === "teacher");

    const content = (
      <div
        key={election._id}
        className={`border rounded-xl p-3 mb-3 ${config.bg} ${config.border} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      >
        <div className="flex justify-between">
          <div>
            <div className={`font-semibold ${config.titleColor}`}>
              {election.title}
            </div>
            <div className="text-sm text-gray-600">
              {election.description}
            </div>
            <div className={`text-xs mt-1 ${
              status === 'upcoming' ? 'text-orange-600' :
              status === 'active' ? 'text-green-600' : 'text-gray-500'
            }`}>
              {status === 'upcoming' && `📅 Starts: ${election.startDate ? new Date(election.startDate).toLocaleString() : "Not set"}`}
              {status === 'active' && `🚀 Started: ${election.startDate ? new Date(election.startDate).toLocaleString() : "Not set"}`}
              {status === 'completed' && `✅ Completed: ${election.endDate ? new Date(election.endDate).toLocaleString() : "Not set"}`}
            </div>
            {candidateCount > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {candidateCount} candidate(s) participated
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            {isClickable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewResults(election._id);
                }}
                className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                📊 View Results
              </button>
            )}
          </div>
        </div>
      </div>
    );

    // Make the entire card clickable for students viewing completed elections
    if (isClickable) {
      return (
        <div key={election._id} onClick={() => handleViewResults(election._id)}>
          {content}
        </div>
      );
    }

    return content;
  };

  // Render class information for teachers
  const renderClassInfo = () => {
    if (!roleConfig.showClassInfo || !classData) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Class Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
            <span className="text-sm font-medium">{classData.name}</span>
          </div>
          {classData.year && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Year:</span>
              <span className="text-sm font-medium">{classData.year}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Department:</span>
            <span className="text-sm font-medium">{classData.department?.name}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render elections section
  const renderElectionsSection = (title, elections, status, countColor = "text-gray-500") => {
    if (elections.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="text-lg sm:text-xl font-bold text-gray-900">{title}</div>
          <div className={`text-xs font-semibold ${countColor}`}>{elections.length} {status.toUpperCase()}</div>
        </div>
        <div className="space-y-2">
          {elections.map((election) => renderElectionCard(election, status))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ShellComponent title={roleConfig.title} subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg sm:text-xl">Loading...</div>
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
      backTo={`/${userRole}/dashboard`}
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
        <input
          type="text"
          placeholder="Search elections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base w-full text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
        />
      </div>

      {/* Elections by Status */}
      {roleConfig.showAllStatuses ? (
        <>
          {renderElectionsSection("Completed Elections", completed, "completed")}
          {renderElectionsSection("Active Elections", active, "active", "text-green-500")}
          {renderElectionsSection("Upcoming Elections", upcoming, "upcoming", "text-yellow-500")}
        </>
      ) : (
        <>
          {completed.length > 0 ? (
            renderElectionsSection("Completed Elections", completed, "completed")
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
              <div className="text-center py-8 sm:py-12">
                <div className="text-gray-600">
                  {search ? "No elections found matching your search." : "No completed elections available yet."}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Results will be shown after elections end.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Elections Message */}
      {getFilteredElections().length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 mb-6">
          <div className="text-center py-8 sm:py-12">
            <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🗳️</div>
            <div className="text-gray-600 font-medium">
              {search ? "No elections found matching your search" : "No elections available yet"}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {search ? "Try a different search term" : "Results will appear here when elections are completed"}
            </div>
          </div>
        </div>
      )}
    </ShellComponent>
  );
}
