import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function VotePage() {
  const navigate = useNavigate();
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!electionId) {
      setLoading(false);
      setError("No election selected");
      return;
    }
    const fetchData = async () => {
      try {
        const res = await studentAPI.getElectionCandidates(electionId);
        setElection(res.data?.election || { _id: electionId, title: "Election" });
        setCandidates(res.data?.candidates || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load candidates");
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [electionId]);

  const handleConfirmVote = async () => {
    if (!selectedId || !electionId) return;
    setSubmitting(true);
    setError("");
    try {
      await studentAPI.vote(electionId, selectedId);
      setConfirmed(true);
      setTimeout(() => {
        navigate("/student/elections");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentMobileShell title="Vote" subtitle="Loading..." backTo="/student/elections">
        <div className="text-white/90 text-sm">Loading...</div>
      </StudentMobileShell>
    );
  }

  if (error && candidates.length === 0) {
    return (
      <StudentMobileShell title="Vote" subtitle="Select candidate" backTo="/student/elections">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      </StudentMobileShell>
    );
  }

  return (
    <StudentMobileShell
      title="Select Candidate"
      subtitle={election?.title || "Election"}
      backTo="/student/elections"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!confirmed ? (
        candidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-600">
            No candidates in this election
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate._id}
                  onClick={() => setSelectedId(candidate._id)}
                  className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition ${
                    selectedId === candidate._id
                      ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={selectedId === candidate._id}
                      onChange={() => setSelectedId(candidate._id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{candidate.name}</h3>
                      <p className="text-sm text-gray-600">{candidate.position || "Candidate"}</p>
                    </div>
                    {selectedId === candidate._id ? (
                      <div className="text-emerald-600 text-xl font-bold">✓</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmVote}
              disabled={!selectedId || submitting}
              className={`w-full py-3 rounded-xl font-semibold transition mt-2 ${
                selectedId && !submitting
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {submitting ? "Submitting..." : "Confirm Vote"}
            </button>
          </>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-6xl mb-3">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Recorded!</h2>
          <p className="text-gray-600">Your vote has been successfully recorded.</p>
        </div>
      )}
    </StudentMobileShell>
  );
}
