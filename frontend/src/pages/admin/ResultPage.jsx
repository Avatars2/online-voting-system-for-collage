import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function ResultPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await adminAPI.elections.list();
        setElections(res.data || []);
        setSelectedElection((prev) => prev || (res.data?.[0]?._id || null));
      } catch {
        setElections([]);
      }
    };
    fetchElections();
  }, []);

  useEffect(() => {
    if (!selectedElection) {
      setResultData(null);
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminAPI.results(selectedElection);
        setResultData(res.data || null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load results");
        setResultData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedElection]);

  const candidates = resultData?.candidates || [];
  const winner = resultData?.winner || null;
  const maxVotes = Math.max(...candidates.map((r) => r.votes || 0), 1);

  // Filter elections for results - only show elections that have ended
  const now = new Date();
  const completedElections = elections.filter(e => {
    const endDate = e.endDate ? new Date(e.endDate) : null;
    return endDate && endDate < now;
  });

  const filteredElections = completedElections.filter((e) =>
    !search ? true : String(e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminMobileShell
      title="Election Results"
      subtitle="Archive of completed polls"
      headerColor="bg-gradient-to-r from-slate-700 to-slate-900"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          className="input-base"
          placeholder="Search elections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredElections.length > 0 && (
          <div className="mt-3 space-y-2">
            {filteredElections.map((e) => (
              <button
                key={e._id}
                onClick={() => navigate(`/admin/results/detail?electionId=${e._id}`)}
                className="w-full text-left p-4 rounded-xl border hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{e.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {e.level === "department"
                        ? `Department`
                        : e.level === "class"
                          ? `Class`
                          : `All College (Global)`}
                      {e.endDate && ` • Ended: ${new Date(e.endDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {typeof e.candidateCount === "number" ? `${e.candidateCount} candidates` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : candidates.length > 0 ? (
        <>
          {winner && (
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-4">
              <div className="text-xs font-semibold text-yellow-700 uppercase">Official Winner</div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-gray-900">{winner.name}</div>
                  {winner.position ? <div className="text-sm text-gray-600">{winner.position}</div> : null}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-700">{winner.votes || 0}</div>
                  <div className="text-xs text-gray-600">votes</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="text-sm font-bold text-gray-700 uppercase mb-3">Vote Breakdown</div>
            <div className="space-y-4">
              {candidates.map((c) => (
                <div key={c._id}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-gray-700">{c.votes || 0}</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${winner?._id === c._id ? "bg-yellow-500" : "bg-blue-600"}`}
                      style={{ width: `${((c.votes || 0) / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
          No results available yet
        </div>
      )}
    </AdminMobileShell>
  );
}
