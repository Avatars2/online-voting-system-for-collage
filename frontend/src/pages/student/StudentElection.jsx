import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentElection() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  const getStatus = (election) => {
    if (!election) return "Unknown";
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    if (start && now < start) return "Upcoming";
    if (end && now > end) return "Closed";
    return "Active";
  };

  const handleElectionClick = (election) => {
    const status = getStatus(election);
    if (status === "Active") {
      navigate(`/student/vote/${election._id}`);
    }
  };

  return (
    <StudentMobileShell
      title="Elections"
      subtitle="Available polls"
      backTo="/student/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : elections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
          No elections available
        </div>
      ) : (
        <div className="space-y-3">
          {elections.map((election) => {
            const status = getStatus(election);
            return (
              <div
                key={election._id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:bg-emerald-50 transition ${
                  status === "Active" ? "" : "opacity-80"
                }`}
                onClick={() => handleElectionClick(election)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base truncate">{election.title}</h3>
                    {election.description ? (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{election.description}</p>
                    ) : null}
                    {(election.startDate || election.endDate) ? (
                      <p className="text-xs text-gray-600 mt-2">
                        📅 {election.startDate ? new Date(election.startDate).toLocaleDateString() : ""}{" "}
                        - {election.endDate ? new Date(election.endDate).toLocaleDateString() : ""}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      status === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "Upcoming"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                {status === "Active" ? (
                  <div className="mt-3 text-emerald-700 text-sm font-semibold">Vote Now →</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </StudentMobileShell>
  );
}
