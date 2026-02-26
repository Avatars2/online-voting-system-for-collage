import { useState, useEffect } from "react";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentResult() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState([]);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await studentAPI.elections();
        const allElections = res.data || [];
        // Filter to show only elections that have ended
        const now = new Date();
        const completedElections = allElections.filter(e => {
          const endDate = e.endDate ? new Date(e.endDate) : null;
          return endDate && endDate < now;
        });
        setElections(completedElections);
        setSelectedElection((prev) => prev || (completedElections[0]?._id || null));
      } catch {
        setElections([]);
      }
    };
    fetchElections();
  }, []);

  useEffect(() => {
    if (!selectedElection) {
      setResults([]);
      setWinner(null);
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await studentAPI.getElectionCandidates(selectedElection);
        const candidates = res.data?.candidates || [];
        const sortedCandidates = candidates.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        setResults(sortedCandidates);
        // Set winner as the candidate with most votes
        if (sortedCandidates.length > 0) {
          setWinner(sortedCandidates[0]);
        }
      } catch {
        setError("Failed to load results");
        setResults([]);
        setWinner(null);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedElection]);

  const maxVotes = Math.max(...results.map((r) => r.votes || 0), 1);

  return (
    <StudentMobileShell
      title="Election Results"
      subtitle="Archive of completed polls"
      backTo="/student/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {elections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Election</label>
          <select
            className="input-base"
            value={selectedElection || ""}
            onChange={(e) => setSelectedElection(e.target.value || null)}
          >
            {elections.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title} {e.endDate && `(Ended: ${new Date(e.endDate).toLocaleDateString()})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : results.length > 0 ? (
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
              {results.map((result) => (
                <div key={result._id}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="font-medium text-gray-900">{result.name}</div>
                    <div className="text-gray-700">{result.votes || 0}</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${winner?._id === result._id ? "bg-yellow-500" : "bg-emerald-600"}`}
                      style={{ width: `${((result.votes || 0) / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
          No completed elections available yet. Results will be shown after elections end.
        </div>
      )}
    </StudentMobileShell>
  );
}
