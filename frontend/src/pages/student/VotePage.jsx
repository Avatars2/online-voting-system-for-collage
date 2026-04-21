import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";
import OTPVerification from "../../components/OTPVerification";

export default function VotePage() {
  const navigate = useNavigate();
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [studentEmail, setStudentEmail] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  useEffect(() => {
    if (!electionId) {
      setLoading(false);
      setMessage("No election selected");
      setMessageType("error");
      return;
    }
    const fetchData = async () => {
      try {
        console.log("VotePage: Fetching data for electionId:", electionId);
        const [candidatesRes, studentRes] = await Promise.all([
          studentAPI.getElectionCandidates(electionId),
          studentAPI.me()
        ]);
        
        console.log("VotePage: Candidates response:", candidatesRes.data);
        console.log("VotePage: Student response:", studentRes.data);
        
        setElection(candidatesRes.data?.election || { _id: electionId, title: "Election" });
        
        // Clean candidate names by removing [DELETED USER] text
        const allCandidates = candidatesRes.data?.candidates || [];
        const cleanedCandidates = allCandidates.map(candidate => ({
          ...candidate,
          name: candidate.name?.replace(/\[DELETED USER\]/g, '').trim() || 'Unknown Candidate',
          student: candidate.student ? {
            ...candidate.student,
            name: candidate.student.name?.replace(/\[DELETED USER\]/g, '').trim() || 'Unknown Candidate'
          } : candidate.student
        }));
        setCandidates(cleanedCandidates);
        
        const email = studentRes.data?.email || "";
        setStudentEmail(email);
        console.log("VotePage: Set student email to:", email);
        
      } catch (err) {
        console.error("VotePage: Error fetching data:", err);
        setMessage(err.response?.data?.error || "Failed to load candidates");
        setMessageType("error");
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [electionId]);

  const handleConfirmVote = async () => {
    if (!selectedId || !electionId) {
      console.log("handleConfirmVote: Missing selectedId or electionId", { selectedId, electionId });
      return;
    }
    
    // Use fallback email for development if student email is empty
    let emailToUse = studentEmail;
    if (!studentEmail) {
      console.warn("handleConfirmVote: Student email is empty, using fallback");
      emailToUse = "test@student.com"; // Fallback for development
    }
    
    console.log("handleConfirmVote: Using email:", emailToUse);
    
    // First send OTP and show verification
    try {
      setSubmitting(true);
      console.log("handleConfirmVote: Sending OTP request for email:", emailToUse);
      
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ email: emailToUse })
      });

      console.log("handleConfirmVote: Response status:", response.status);
      const data = await response.json();
      console.log("handleConfirmVote: Response data:", data);
      
      if (response.ok) {
        setMessage("OTP sent to your email!");
        setMessageType("success");
        setShowOTP(true);
      } else {
        console.error("handleConfirmVote: Server error:", data.error);
        setMessage(data.error || "Failed to send OTP");
        setMessageType("error");
      }
    } catch (err) {
      console.error("handleConfirmVote: Network error:", err);
      setMessage("Failed to send OTP");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteAfterOTP = async () => {
    if (!selectedId || !electionId) return;
    setSubmitting(true);
    setMessage("");
    setMessageType("error");
    try {
      await studentAPI.vote(electionId, selectedId);
      setConfirmed(true);
      setShowOTP(false);
      setMessage("Vote recorded successfully!");
      setMessageType("success");
      setTimeout(() => {
        navigate("/student/elections");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to submit vote");
      setMessageType("error");
      setShowOTP(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentMobileShell title="Vote" subtitle="Loading..." backTo="/student/elections">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg sm:text-xl">Loading...</div>
          </div>
        </div>
      </StudentMobileShell>
    );
  }

  if (message && candidates.length === 0) {
    return (
      <StudentMobileShell title="Vote" subtitle="Select candidate" backTo="/student/elections">
        <div className={`p-3 border rounded-xl text-sm ${
          messageType === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message}
        </div>
      </StudentMobileShell>
    );
  }

  return (
    <>
      <StudentMobileShell
        title="Select Candidate"
        subtitle={election?.title || "Election"}
        backTo="/student/elections"
      >
        {message && (
          <div className={`p-3 border rounded-xl text-sm ${
            messageType === "success" 
              ? "bg-green-50 border-green-200 text-green-700" 
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {message}
          </div>
        )}

        {!confirmed ? (
          candidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 lg:p-16 text-center text-gray-600">
              No candidates in this election
            </div>
          ) : (
            <>
              <div className="space-y-4 sm:space-y-6">
                {candidates.map((candidate, index) => (
                  <div
                    key={candidate._id}
                    onClick={() => setSelectedId(candidate._id)}
                    className={`bg-white rounded-2xl border shadow-sm p-6 sm:p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md animate-fadeInUp ${
                      selectedId === candidate._id
                        ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200 scale-[1.03]"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedId === candidate._id}
                        onChange={() => setSelectedId(candidate._id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-grow min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{candidate.name}</h3>
                        <p className="text-base sm:text-lg text-gray-600">{candidate.position || "Candidate"}</p>
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
                className={`w-full py-4 sm:py-6 rounded-xl font-semibold transition mt-6 text-base sm:text-lg ${
                  selectedId && !submitting
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                {submitting ? "Sending OTP..." : "Confirm Vote"}
              </button>
            </>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 lg:p-16 text-center">
            <div className="text-6xl mb-3">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Recorded!</h2>
            <p className="text-gray-600">Your vote has been successfully recorded.</p>
          </div>
        )}
      </StudentMobileShell>

      {/* OTP Verification Modal */}
      {showOTP && (
        <OTPVerification
          email={studentEmail}
          onVerified={handleVoteAfterOTP}
          onCancel={() => setShowOTP(false)}
          onResend={() => handleConfirmVote()}
        />
      )}
    </>
  );
}
