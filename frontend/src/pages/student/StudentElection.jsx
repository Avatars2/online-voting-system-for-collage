import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentElection() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await studentAPI.elections();
        setElections(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load elections");
        setElections([]);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();

    // Add real-time updates - refresh every minute
    const interval = setInterval(() => {
      fetchElections();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const getStatus = (election) => {
    if (!election) return "Unknown";
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    
    if (start && now < start) return "Upcoming";
    if (end && now >= end) return "Closed"; // Changed from > to >= to handle exact end time
    return "Active";
  };

  const handleElectionClick = (election) => {
    const status = getStatus(election);
    if (status === "Active") {
      if (election.hasVoted) {
        // Show message that student has already voted
        return;
      } else {
        navigate(`/student/vote/${election._id}`);
      }
    }
  };

  // Filter elections based on search
  const getFilteredElections = () => {
    if (!search) return elections;
    
    return elections.filter((election) =>
      String(election.title || "").toLowerCase().includes(search.toLowerCase())
    );
  };

  // Categorize elections by status
  const categorizeElections = () => {
    const filtered = getFilteredElections();
    const now = new Date();

    const active = filtered.filter(e => {
      const status = getStatus(e); // Use the updated getStatus function
      return status === "Active";
    });

    const upcoming = filtered.filter(e => {
      const status = getStatus(e); // Use the updated getStatus function
      return status === "Upcoming";
    });

    const closed = filtered.filter(e => {
      const status = getStatus(e); // Use the updated getStatus function
      return status === "Closed";
    });

    return { active, upcoming, closed };
  };

  // Render election card (matching results page style)
  const renderElectionCard = (election, status = "active") => {
    const hasVoted = election.hasVoted;
    const candidateCount = election.candidateCount || (election.candidates ? election.candidates.length : 0);
    
    const statusConfig = {
      active: {
        borderColor: hasVoted ? "border-gray-200 bg-gray-50" : "border-green-200 bg-green-50",
        statusColor: hasVoted ? "text-purple-600" : "text-green-600",
        statusText: hasVoted ? "Already Voted" : "Vote Now"
      },
      upcoming: {
        borderColor: "border-yellow-200 bg-yellow-50",
        statusColor: "text-yellow-600",
        statusText: "Scheduled"
      },
      closed: {
        borderColor: "hover:border-slate-300 hover:bg-slate-50",
        statusColor: "text-gray-600",
        statusText: "Ended"
      }
    };

    const config = statusConfig[status];
    const isClickable = status === "active" && !hasVoted;

    const content = (
      <div className={`w-full text-left p-4 rounded-xl border transition ${config.borderColor}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{election.title}</div>
            {election.description && (
              <div className="text-xs text-gray-600 mt-1 truncate">{election.description}</div>
            )}
            <div className={`text-xs ${config.statusColor} mt-1`}>
              {election.level === "department"
                ? `Department Election • `
                : election.level === "class"
                  ? `Class Election • `
                  : `All College (Global) • `}
              {status === "active" && election.endDate && 
                `Ends: ${new Date(election.endDate).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`
              }
              {status === "upcoming" && election.startDate && 
                `Starts: ${new Date(election.startDate).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`
              }
              {status === "closed" && election.endDate && 
                `Ended: ${new Date(election.endDate).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}`
              }
              {status === "active" && !hasVoted && " 🗳️ " + config.statusText}
              {status === "active" && hasVoted && " ✅ " + config.statusText}
              {status === "upcoming" && " 📅 " + config.statusText}
              {status === "closed" && " 📊 " + config.statusText}
            </div>
            {/* Add end time for active elections */}
            {status === "active" && election.endDate && (
              <div className="text-xs text-gray-500 mt-1">
                Voting ends: {new Date(election.endDate).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
          {candidateCount > 0 && (
            <div className="text-xs text-gray-600">
              {candidateCount} candidates
            </div>
          )}
        </div>
      </div>
    );

    if (isClickable) {
      return (
        <button
          key={election._id}
          onClick={() => handleElectionClick(election)}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={election._id}>
        {content}
      </div>
    );
  };

  // Render elections section
  const renderElectionsSection = (title, elections, status, countColor = "text-gray-500") => {
    if (elections.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">{title}</div>
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
      <StudentMobileShell title="Available Elections" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </StudentMobileShell>
    );
  }

  const { active, upcoming, closed } = categorizeElections();

  return (
    <StudentMobileShell
      title="Available Elections"
      subtitle="Participate in voting"
      backTo="/student/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search elections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base w-full"
        />
      </div>

      {/* Elections by Status */}
      {renderElectionsSection("Active Elections", active, "active", "text-green-500")}
      {renderElectionsSection("Upcoming Elections", upcoming, "upcoming", "text-yellow-500")}

      {/* No Elections Message */}
      {getFilteredElections().length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🗳️</div>
            <div className="text-gray-600 font-medium">
              {search ? "No elections found matching your search" : "No elections available yet"}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {search ? "Try a different search term" : "Check back later for new voting opportunities"}
            </div>
          </div>
        </div>
      )}
    </StudentMobileShell>
  );
}
