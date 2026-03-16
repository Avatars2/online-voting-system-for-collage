import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { adminAPI, hodAPI, teacherAPI, studentAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import StudentMobileShell from "../../components/StudentMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function UnifiedResultDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const electionId = params.get("electionId");
  const [userRole, setUserRole] = useState("");

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);

  // Get current user role
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  // Fetch data based on role
  useEffect(() => {
    if (!userRole || !electionId) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      
      try {
        switch (userRole) {
          case "admin":
            await fetchAdminResult();
            break;
          case "hod":
            await fetchHODResult();
            break;
          case "teacher":
            await fetchTeacherResult();
            break;
          case "student":
            await fetchStudentResult();
            break;
        }
      } catch (err) {
        console.error("Error fetching result details:", err);
        setError(err.response?.data?.error || "Failed to load result details");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, electionId]);

  const fetchAdminResult = async () => {
    const res = await adminAPI.elections.results(electionId);
    setData(res.data || null);
  };

  const fetchHODResult = async () => {
    const res = await hodAPI.results(electionId);
    setData(res.data || null);
  };

  const fetchTeacherResult = async () => {
    const userResponse = await teacherAPI.profile();
    const userData = userResponse.data?.user || userResponse.data || null;
    setUser(userData);

    if (userData?.assignedClass) {
      const classId = typeof userData.assignedClass === 'object' ? 
        userData.assignedClass._id || userData.assignedClass.toString() : 
        userData.assignedClass;
      
      const [classResponse, resultsResponse] = await Promise.all([
        teacherAPI.getClass(classId),
        teacherAPI.results(electionId)
      ]);
      
      setClassData(classResponse.data);
      
      // Transform teacher results to match admin/HOD format
      const results = resultsResponse.data?.results || [];
      const candidates = results.map(result => ({
        _id: result.candidate?._id,
        name: result.candidate?.name,
        student: result.candidate,
        votes: result.votes
      }));
      
      setData({
        candidates,
        election: resultsResponse.data?.election,
        results,
        votingStats: resultsResponse.data?.votingStats || {}
      });
    } else {
      // If no class assigned, still try to get results without class data
      const resultsResponse = await teacherAPI.results(electionId);
      const results = resultsResponse.data?.results || [];
      const candidates = results.map(result => ({
        _id: result.candidate?._id,
        name: result.candidate?.name,
        student: result.candidate,
        votes: result.votes
      }));
      
      setData({
        candidates,
        election: resultsResponse.data?.election,
        results,
        votingStats: resultsResponse.data?.votingStats || {}
      });
    }
  };

  const fetchStudentResult = async () => {
    const res = await studentAPI.getElectionCandidates(electionId);
    const candidates = res.data?.candidates || [];
    const sortedCandidates = candidates.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    
    // Calculate winner/draw logic for students
    let winner = null;
    let isDraw = false;
    let tiedCandidates = [];
    let message = "";
    
    if (sortedCandidates.length > 0) {
      const topVotes = sortedCandidates[0].votes;
      const topCandidates = sortedCandidates.filter(candidate => candidate.votes === topVotes);
      
      if (topCandidates.length > 1 && topVotes > 0) {
        isDraw = true;
        tiedCandidates = topCandidates;
        winner = null;
        message = "Election resulted in a draw - no winner declared";
      } else if (topVotes > 0) {
        winner = sortedCandidates[0];
        isDraw = false;
        message = "Winner declared";
      } else {
        message = "No votes cast";
      }
    }
    
    setData({
      candidates: sortedCandidates,
      winner,
      isDraw,
      tiedCandidates,
      message,
      votingStats: res.data?.votingStats || {}
    });
  };

  // Get role configuration
  const getRoleConfig = () => {
    switch (userRole) {
      case "admin":
        return {
          title: "Election Outcome",
          subtitle: "Final verdict",
          headerColor: "bg-gradient-to-r from-slate-800 to-slate-950",
          backTo: "/admin/results",
          shellComponent: AdminMobileShell
        };
      case "hod":
        return {
          title: "Election Outcome",
          subtitle: "Final verdict",
          headerColor: "bg-gradient-to-r from-green-600 to-teal-700",
          backTo: "/hod/results",
          shellComponent: AdminMobileShell
        };
      case "teacher":
        return {
          title: "Election Results",
          subtitle: classData?.name ? `${classData.name} Results` : "Class Results",
          headerColor: "bg-gradient-to-r from-blue-600 to-indigo-700",
          backTo: "/teacher/results",
          shellComponent: AdminMobileShell
        };
      case "student":
        return {
          title: "Election Results",
          subtitle: "View results",
          headerColor: "bg-gradient-to-r from-purple-600 to-pink-600",
          backTo: "/student/results",
          shellComponent: StudentMobileShell
        };
      default:
        return {
          title: "Election Results",
          subtitle: "Results",
          headerColor: "bg-gradient-to-r from-gray-600 to-gray-700",
          backTo: `/${userRole}/results`,
          shellComponent: AdminMobileShell
        };
    }
  };

  const roleConfig = getRoleConfig();
  const ShellComponent = roleConfig.shellComponent;

  // Extract common data
  const candidates = data?.candidates || [];
  const winner = data?.winner || null;
  const isDraw = data?.isDraw || false;
  const tiedCandidates = data?.tiedCandidates || [];
  const message = data?.message || "";
  const votingStats = data?.votingStats || {};
  const maxVotes = Math.max(...candidates.map((c) => c.votes || 0), 1);

  // Render functions
  const renderWinnerDisplay = () => {
    if (!winner || isDraw) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-yellow-200">
        <div className="text-center">
          <div className="text-xs font-semibold tracking-widest text-yellow-700 uppercase">
            Official Winner
          </div>
          <div className="mt-3 flex justify-center">
            <div className="w-20 h-20 rounded-full ring-4 ring-yellow-400 overflow-hidden bg-gray-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-700">
                {String(winner.student?.name || winner.name || "?").slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-gray-900">
            {winner.student?.name || winner.name}
          </div>
          <div className="inline-block mt-2 px-4 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold">
            {winner.votes || 0} Total Votes
          </div>
        </div>
      </div>
    );
  };

  const renderDrawDisplay = () => {
    if (!isDraw) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-orange-200">
        <div className="text-center">
          <div className="text-xs font-semibold tracking-widest text-orange-700 uppercase">
            Election Draw
          </div>
          <div className="mt-3 text-lg font-bold text-orange-800">
            {message}
          </div>
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Tied Candidates:</div>
            <div className="flex justify-center gap-4 flex-wrap">
              {tiedCandidates.map((candidate) => (
                <div key={candidate._id} className="text-center">
                  <div className="w-16 h-16 rounded-full ring-4 ring-orange-300 overflow-hidden bg-gray-100 flex items-center justify-center mx-auto">
                    <span className="text-lg font-bold text-gray-700">
                      {String(candidate.student?.name || candidate.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {candidate.student?.name || candidate.name}
                  </div>
                  <div className="text-xs text-orange-700 font-semibold">
                    {candidate.votes || 0} votes
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNoVotesDisplay = () => {
    if (winner || isDraw || candidates.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">
            {message}
          </div>
        </div>
      </div>
    );
  };

  const renderVoteBreakdown = () => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-sm font-bold text-gray-700 uppercase mb-4">Vote Breakdown</div>
        {candidates.length === 0 ? (
          <div className="text-gray-600">No candidates found.</div>
        ) : (
          <div className="space-y-4">
            {candidates.map((c) => (
              <div key={c._id}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="font-medium text-gray-900">
                    {c.student?.name || c.name}
                  </div>
                  <div className="text-gray-700">{c.votes || 0}</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      isDraw && tiedCandidates.some(tc => tc._id === c._id)
                        ? "bg-orange-500"
                        : winner?._id === c._id
                        ? "bg-yellow-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${((c.votes || 0) / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVotingStatistics = () => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-sm font-bold text-gray-700 uppercase mb-4">Voting Statistics</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {votingStats.totalVotes || 0}
            </div>
            <div className="text-sm text-blue-600 mt-1">Total Eligible Students</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {votingStats.studentsWhoVoted || 0}
            </div>
            <div className="text-sm text-green-600 mt-1">Students Who Voted</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">
              {votingStats.studentsWhoDidNotVote || 0}
            </div>
            <div className="text-sm text-orange-600 mt-1">Students Not Voted</div>
          </div>
        </div>
      </div>
    );
  };

  if (!electionId) {
    return (
      <ShellComponent
        title={roleConfig.title}
        subtitle={roleConfig.subtitle}
        headerColor={roleConfig.headerColor}
        backTo={roleConfig.backTo}
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-gray-700">
          Missing electionId.
        </div>
      </ShellComponent>
    );
  }

  return (
    <ShellComponent
      title={roleConfig.title}
      subtitle={roleConfig.subtitle}
      headerColor={roleConfig.headerColor}
      backTo={roleConfig.backTo}
    >
      {loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      ) : (
        <>
          {/* Voting Statistics */}
          {renderVotingStatistics()}

          {/* Winner Display */}
          {renderWinnerDisplay()}

          {/* Draw Display */}
          {renderDrawDisplay()}

          {/* No Votes Display */}
          {renderNoVotesDisplay()}

          {/* Vote Breakdown */}
          {renderVoteBreakdown()}
        </>
      )}
    </ShellComponent>
  );
}
