import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import { adminAPI, hodAPI, teacherAPI, studentAPI, authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function UnifiedElectionCreationPage() {

  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [userRole, setUserRole] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    level: "global"
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: ""
  });

  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [editingElection, setEditingElection] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const [loading, setLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState("");

  // Custom time picker state
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTime, setStartTime] = useState({ hours: '', minutes: '' });
  const [endTime, setEndTime] = useState({ hours: '', minutes: '' });

  // Get current datetime for validation
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get minimum end datetime based on start date
  const getMinEndDateTime = (startDate) => {
    if (!startDate) return getCurrentDateTime();
    const start = new Date(startDate);
    start.setMinutes(start.getMinutes() + 1); // End time must be at least 1 minute after start
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Validate date inputs
  const validateDateInputs = (startDate, endDate) => {
    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && start < now) {
      return "Start date and time cannot be before current time";
    }

    if (start && end && end <= start) {
      return "End date and time must be after start date and time";
    }

    return "";
  };

  // Time picker functions
  const generateHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(String(i).padStart(2, '0'));
    }
    return hours;
  };

  const generateMinutes = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += 5) {
      minutes.push(String(i).padStart(2, '0'));
    }
    return minutes;
  };

  const handleTimeSelect = (type, field, value) => {
    if (type === 'start') {
      setStartTime(prev => ({ ...prev, [field]: value }));
    } else {
      setEndTime(prev => ({ ...prev, [field]: value }));
    }
  };

  const applyTimeSelection = (type) => {
    const time = type === 'start' ? startTime : endTime;
    const dateStr = type === 'start' ? formData.startDate : formData.endDate;
    
    if (dateStr && time.hours && time.minutes) {
      const newDateTime = `${dateStr.split('T')[0]}T${time.hours}:${time.minutes}`;
      if (type === 'start') {
        setFormData(prev => ({ ...prev, startDate: newDateTime }));
        setShowStartTimePicker(false);
      } else {
        setFormData(prev => ({ ...prev, endDate: newDateTime }));
        setShowEndTimePicker(false);
      }
    }
  };

  const openTimePicker = (type) => {
    const dateStr = type === 'start' ? formData.startDate : formData.endDate;
    if (dateStr) {
      const time = dateStr.split('T')[1] || '00:00';
      const [hours, minutes] = time.split(':');
      if (type === 'start') {
        setStartTime({ hours, minutes: minutes.slice(0, 2) });
        setShowStartTimePicker(true);
      } else {
        setEndTime({ hours, minutes: minutes.slice(0, 2) });
        setShowEndTimePicker(true);
      }
    }
  };

  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [teacherClass, setTeacherClass] = useState(null);

  useEffect(() => {

    const role = localStorage.getItem("role");
    setUserRole(role);

    if (!role) return;

    const fetchData = async () => {

      try {

        if (role === "admin") {

          const [electionsRes, studentsRes] = await Promise.all([
            adminAPI.elections.list(),
            adminAPI.students.list()
          ]);

          console.log("Admin elections response:", electionsRes.data);
          setElections(electionsRes.data || []);
          setStudents(studentsRes.data || []);

        }

        if (role === "hod") {

          const [userRes, electionsRes, studentsRes] = await Promise.all([
            authAPI.verifyToken(),
            hodAPI.elections.list(),
            hodAPI.students.list()
          ]);

          const userData = userRes.data?.user || userRes.data;

          setUser(userData);
          setDepartment(userData?.department);

          console.log("HOD elections response:", electionsRes.data);
          setElections(electionsRes.data || []);
          setStudents(studentsRes.data || []);

        }

        if (role === "teacher") {

          const [userRes, electionsRes, studentsRes] = await Promise.all([
            authAPI.verifyToken(),
            teacherAPI.elections.list(),
            teacherAPI.students.list()
          ]);

          const userData = userRes.data?.user || userRes.data;

          setUser(userData);
          setTeacherClass(userData?.assignedClass);

          console.log("Teacher elections response:", electionsRes.data);
          setElections(electionsRes.data || []);
          setStudents(studentsRes.data || []);

        }

        if (role === "student") {

          const res = await studentAPI.elections();
          console.log("Student elections response:", res.data);
          setElections(res.data || []);

        }

      } catch (err) {

        console.error("Error fetching elections:", err);
        console.error("Error response:", err.response?.data);
        setElections([]);

      }

    };

    fetchData();

  }, []);


  const getStatus = (election) => {

    if (!election) return "Unknown";

    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;

    if (start && now < start) return "Upcoming";
    if (end && now >= end) return "Closed";
    if (start && now >= start && (!end || now < end)) return "Active";

    return "Unknown";

  };


  const getElectionsByStatus = () => {

    if (!Array.isArray(elections)) {
      console.log("Elections is not an array:", elections);
      return { upcoming: [], active: [], closed: [] };
    }

    const upcoming = elections.filter(e => getStatus(e) === "Upcoming");
    const active = elections.filter(e => getStatus(e) === "Active");
    const closed = elections.filter(e => getStatus(e) === "Closed");

    return { upcoming, active, closed };

  };

  const { upcoming, active, closed } = getElectionsByStatus();

  console.log("Elections state:", { elections: elections.length, upcoming: upcoming.length, active: active.length, closed: closed.length });
  console.log("User role:", userRole, "Show closed elections:", (userRole === "admin" || userRole === "hod" || userRole === "teacher"));


  const handleCreateElection = async () => {

    if (!formData.title || !formData.startDate || !formData.endDate) {
      setError("Fill all required fields");
      return;
    }

    // Validate date inputs
    const validationError = validateDateInputs(formData.startDate, formData.endDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {

      const payload = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate
      };

      if (userRole === "hod" && department) {
        payload.department = department._id;
      }

      if (userRole === "teacher" && teacherClass) {
        payload.class = teacherClass._id;
        payload.department = teacherClass.department;
      }

      if (userRole === "admin") await adminAPI.elections.create(payload);
      if (userRole === "hod") await hodAPI.elections.create(payload);
      if (userRole === "teacher") await teacherAPI.elections.create(payload);

      success("Election created");

      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: ""
      });

      // Refresh elections list after creation
      try {
        let electionsRes;
        if (userRole === "admin") {
          electionsRes = await adminAPI.elections.list();
        } else if (userRole === "hod") {
          electionsRes = await hodAPI.elections.list();
        } else if (userRole === "teacher") {
          electionsRes = await teacherAPI.elections.list();
        }
        setElections(electionsRes.data || []);
      } catch (refreshErr) {
        console.error("Failed to refresh elections:", refreshErr);
      }

    } catch (err) {

      console.error("Error creating election:", err);
      console.error("Error response:", err.response?.data);
      showError(err.response?.data?.error || "Create failed");

    }

    setLoading(false);

  };

  const handleEditElection = (election) => {
    setEditingElection(election);
    setEditFormData({
      title: election.title,
      description: election.description,
      startDate: election.startDate ? new Date(election.startDate).toISOString().slice(0, 16) : "",
      endDate: election.endDate ? new Date(election.endDate).toISOString().slice(0, 16) : ""
    });
    setShowEditModal(true);
  };

  const handleUpdateElection = async () => {
    if (!editFormData.title || !editFormData.startDate || !editFormData.endDate) {
      setError("Fill all required fields");
      return;
    }

    if (new Date(editFormData.startDate) >= new Date(editFormData.endDate)) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: editFormData.title,
        description: editFormData.description,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate
      };

      let apiCall;
      if (userRole === "admin") {
        apiCall = adminAPI.elections.update(editingElection._id, payload);
      } else if (userRole === "hod") {
        apiCall = hodAPI.elections.update(editingElection._id, payload);
      } else if (userRole === "teacher") {
        apiCall = teacherAPI.elections.update(editingElection._id, payload);
      }

      await apiCall;
      success("Election updated");

      // Refresh elections list
      let electionsRes;
      if (userRole === "admin") {
        electionsRes = await adminAPI.elections.list();
      } else if (userRole === "hod") {
        electionsRes = await hodAPI.elections.list();
      } else if (userRole === "teacher") {
        electionsRes = await teacherAPI.elections.list();
      }
      setElections(electionsRes.data || []);

      setShowEditModal(false);
      setEditingElection(null);
    } catch (err) {
      console.error("Error updating election:", err);
      showError(err.response?.data?.error || "Update failed");
    }
    setLoading(false);
  };

  const handleAddCandidate = async () => {
    if (!selectedStudent) {
      setError("Please select a student");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const payload = { userId: selectedStudent };

      let apiCall;
      if (userRole === "admin") {
        apiCall = adminAPI.elections.addCandidate(selectedElection, payload);
      } else if (userRole === "hod") {
        apiCall = hodAPI.elections.addCandidate(selectedElection, payload);
      } else if (userRole === "teacher") {
        apiCall = teacherAPI.elections.addCandidate(selectedElection, payload);
      }

      await apiCall;
      success("Candidate added successfully");

      // Clear the selected student immediately
      setSelectedStudent("");
      setStudentSearch("");

      // Refresh elections list to show new candidate with a small delay to ensure backend consistency
      setTimeout(async () => {
        try {
          let electionsRes;
          if (userRole === "admin") {
            electionsRes = await adminAPI.elections.list();
          } else if (userRole === "hod") {
            electionsRes = await hodAPI.elections.list();
          } else if (userRole === "teacher") {
            electionsRes = await teacherAPI.elections.list();
          }
          
          const newElections = electionsRes.data || [];
          console.log("Refreshed elections after adding candidate:", newElections);
          setElections(newElections);
        } catch (refreshErr) {
          console.error("Failed to refresh elections:", refreshErr);
          setError("Candidate added but failed to refresh list");
        }
      }, 500); // Small delay to ensure backend consistency

    } catch (err) {
      console.error("Error adding candidate:", err);
      const errorMessage = err.response?.data?.error || "Failed to add candidate";
      setError(errorMessage);
      showError(errorMessage);
    }

    setLoading(false);
  };

  const handleDeleteCandidate = async (electionId, candidateId) => {
    if (!window.confirm("Are you sure you want to remove this candidate?")) {
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      let apiCall;
      if (userRole === "admin") {
        apiCall = adminAPI.elections.deleteCandidate(electionId, candidateId);
      } else if (userRole === "hod") {
        apiCall = hodAPI.elections.deleteCandidate(electionId, candidateId);
      } else if (userRole === "teacher") {
        apiCall = teacherAPI.elections.deleteCandidate(electionId, candidateId);
      }

      await apiCall;
      success("Candidate removed successfully");

      // Refresh elections list with a small delay to ensure backend consistency
      setTimeout(async () => {
        try {
          let electionsRes;
          if (userRole === "admin") {
            electionsRes = await adminAPI.elections.list();
          } else if (userRole === "hod") {
            electionsRes = await hodAPI.elections.list();
          } else if (userRole === "teacher") {
            electionsRes = await teacherAPI.elections.list();
          }
          
          const newElections = electionsRes.data || [];
          console.log("Refreshed elections after deleting candidate:", newElections);
          setElections(newElections);
        } catch (refreshErr) {
          console.error("Failed to refresh elections:", refreshErr);
          setError("Candidate removed but failed to refresh list");
        }
      }, 500); // Small delay to ensure backend consistency

    } catch (err) {
      console.error("Error deleting candidate:", err);
      const errorMessage = err.response?.data?.error || "Failed to remove candidate";
      setError(errorMessage);
      showError(errorMessage);
    }
    
    setLoading(false);
  };

  const handleCloseElection = async (electionId) => {
    if (!window.confirm("Are you sure you want to close this election immediately? Voting will end and results will be finalized.")) {
      return;
    }

    setLoading(true);
    try {
      const payload = { endDate: new Date().toISOString() }; // Set end time to now
      
      let apiCall;
      if (userRole === "admin") {
        apiCall = adminAPI.elections.update(electionId, payload);
      } else if (userRole === "hod") {
        apiCall = hodAPI.elections.update(electionId, payload);
      } else if (userRole === "teacher") {
        apiCall = teacherAPI.elections.update(electionId, payload);
      }

      await apiCall;
      success("Election closed successfully");

      // Refresh elections list
      let electionsRes;
      if (userRole === "admin") {
        electionsRes = await adminAPI.elections.list();
      } else if (userRole === "hod") {
        electionsRes = await hodAPI.elections.list();
      } else if (userRole === "teacher") {
        electionsRes = await teacherAPI.elections.list();
      }
      setElections(electionsRes.data || []);
    } catch (err) {
      console.error("Error closing election:", err);
      showError(err.response?.data?.error || "Failed to close election");
    }
    setLoading(false);
  };

  const handleDeleteElection = async (electionId) => {
    if (!window.confirm("Are you sure you want to delete this election?")) {
      return;
    }

    setLoading(true);
    try {
      let apiCall;
      if (userRole === "admin") {
        apiCall = adminAPI.elections.delete(electionId);
      } else if (userRole === "hod") {
        apiCall = hodAPI.elections.delete(electionId);
      } else if (userRole === "teacher") {
        apiCall = teacherAPI.elections.delete(electionId);
      }

      await apiCall;
      success("Election deleted");

      // Refresh elections list
      let electionsRes;
      if (userRole === "admin") {
        electionsRes = await adminAPI.elections.list();
      } else if (userRole === "hod") {
        electionsRes = await hodAPI.elections.list();
      } else if (userRole === "teacher") {
        electionsRes = await teacherAPI.elections.list();
      }
      setElections(electionsRes.data || []);
    } catch (err) {
      console.error("Error deleting election:", err);
      showError(err.response?.data?.error || "Failed to delete election");
    }
    setLoading(false);
  };



  const filteredStudents = students.filter(student => {

    const search = studentSearch.toLowerCase();

    const match =
      student.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search) ||
      student.studentId?.toLowerCase().includes(search);

    return match;

  });


  const Shell = userRole === "student" ? StudentMobileShell : AdminMobileShell;

  return (

    <Shell
      title="Elections"
      subtitle="Voting System"
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo={`/${userRole}/dashboard`}
    >

      {error && (

        <div className="p-3 bg-red-100 text-red-700 rounded-xl">
          {error}
        </div>

      )}

      {userRole !== "student" && (

        <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-xl border mb-6">

          <div className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Create Election</div>

          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-base text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-base mt-3 h-32 sm:h-40 resize-none text-base sm:text-lg px-4 py-3 sm:px-6 sm:py-4"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate ? formData.startDate.split('T')[0] : ''}
                min={getCurrentDateTime().split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const currentTime = formData.startDate ? formData.startDate.split('T')[1] || '00:00' : '00:00';
                  setFormData({ 
                    ...formData, 
                    startDate: newDate ? `${newDate}T${currentTime}` : ''
                  });
                  // Clear error when user fixes the issue
                  if (error) {
                    const validationError = validateDateInputs(
                      newDate ? `${newDate}T${currentTime}` : '', 
                      formData.endDate
                    );
                    if (!validationError) setError("");
                  }
                }}
                className="input-base"
              />
              {formData.startDate && (
                <button
                  type="button"
                  onClick={() => openTimePicker('start')}
                  className="w-full mt-1 text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  🕐 Time: {formData.startDate.split('T')[1] || '00:00'}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate ? formData.endDate.split('T')[0] : ''}
                min={getMinEndDateTime(formData.startDate).split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const currentTime = formData.endDate ? formData.endDate.split('T')[1] || '00:00' : '00:00';
                  setFormData({ 
                    ...formData, 
                    endDate: newDate ? `${newDate}T${currentTime}` : ''
                  });
                  // Clear error when user fixes the issue
                  if (error) {
                    const validationError = validateDateInputs(
                      formData.startDate,
                      newDate ? `${newDate}T${currentTime}` : ''
                    );
                    if (!validationError) setError("");
                  }
                }}
                className="input-base"
              />
              {formData.endDate && (
                <button
                  type="button"
                  onClick={() => openTimePicker('end')}
                  className="w-full mt-1 text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  🕐 Time: {formData.endDate.split('T')[1] || '00:00'}
                </button>
              )}
            </div>

          </div>

          <button
            onClick={handleCreateElection}
            className="btn-primary w-full mt-3"
            disabled={loading}
          >

            {loading ? "Creating..." : "Create Election"}

          </button>

        </div>

      )}


      {/* ACTIVE */}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10 xl:p-12 mt-6 animate-fadeIn">

        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="text-lg sm:text-xl font-bold text-gray-900">
            Active Elections
          </div>
          <div className="text-xs font-semibold text-green-500">
            {active.length} ACTIVE
          </div>
        </div>

        {active.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-5xl mb-4 text-green-500">?</div>
            <div className="text-gray-500 text-base sm:text-lg font-medium">
              No active elections
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Check back later for active voting opportunities
            </div>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {Array.isArray(active) && active.map((election, index) => (
            <div
              key={election._id}
              className={`border rounded-xl p-4 sm:p-6 bg-green-50 border-green-200 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-md animate-fadeInUp ${
                userRole === "student" ? "hover:bg-green-100" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => {
                if (userRole === "student") {
                  navigate(`/student/election-detail?electionId=${election._id}`);
                }
              }}
            >

            <div className="flex justify-between">

              <div>

                <div className="font-semibold text-green-800">
                  {election.title}
                </div>

                <div className="text-sm text-gray-600">
                  {election.description}
                </div>

                <div className="text-xs text-green-600 mt-1">
                  Started: {election.startDate ? new Date(election.startDate).toLocaleString() : "Not set"}
                </div>

                <div className="text-xs text-green-600">
                  Ends: {election.endDate ? new Date(election.endDate).toLocaleString() : "Not set"}
                </div>

                {election.candidates && election.candidates.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {election.candidates.length} candidate(s) registered
                  </div>
                )}

              </div>

              <div className="flex space-x-2">
                {userRole !== "student" && (
                  <button
                    onClick={() => handleCloseElection(election._id)}
                    disabled={loading}
                    className="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    🏁 Close Election
                  </button>
                )}
              </div>

            </div>

          </div>
        ))}

      </div>


      {/* UPCOMING */}

      <div className="bg-white rounded-xl border p-4 mt-4">

        <div className="font-bold mb-3">
          Upcoming Elections ({upcoming.length})
        </div>

        {upcoming.length === 0 && (

          <div className="text-gray-500 text-sm">
            No upcoming elections
          </div>

        )}

        {Array.isArray(upcoming) && upcoming.map((election) => (
          <div
            key={election._id}
            className={`border rounded-xl p-3 mb-3 cursor-pointer hover:shadow-md transition-shadow ${
              userRole === "student" ? "hover:bg-orange-100" : ""
            }`}
            onClick={() => {
              if (userRole === "student") {
                navigate(`/student/election-detail?electionId=${election._id}`);
              }
            }}
          >

            <div className="flex justify-between">

              <div>

                <div className="font-semibold">
                  {election.title}
                </div>

                <div className="text-sm text-gray-600">
                  {election.description}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Starts: {election.startDate ? new Date(election.startDate).toLocaleString() : "Not set"}
                </div>

                <div className="text-xs text-gray-500">
                  Ends: {election.endDate ? new Date(election.endDate).toLocaleString() : "Not set"}
                </div>

                {election.candidates && election.candidates.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {election.candidates.length} candidate(s) registered
                  </div>
                )}

              </div>

              <div className="flex space-x-2">
                {userRole !== "student" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditElection(election);
                      }}
                      className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElection(election._id);
                      }}
                      className="text-sm bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Candidates
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElection(election._id);
                      }}
                      className="text-sm bg-red-600 text-white px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>

            </div>

            {selectedElection === election._id && (

              <div className="mt-3 pt-3 border-t">

                <input
                  type="text"
                  placeholder="Search students"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="input-base"
                />

                <div className="flex space-x-2 mt-2">
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="input-base flex-1"
                  >

                    <option value="">Select Student</option>

                    {filteredStudents.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.studentId || 'No ID'})
                      </option>
                    ))}

                  </select>

                  <button
                    onClick={handleAddCandidate}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Add Candidate
                  </button>

                </div>

                
                {election.candidates && election.candidates.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Current Candidates ({election.candidates.length}):</div>
                    <div className="space-y-2">
                      {election.candidates.map(candidate => (
                        <div key={candidate._id || candidate.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{candidate.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({candidate.student?.studentId || candidate.studentId || 'No ID'})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteCandidate(election._id, candidate._id)}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-500 text-center py-2 bg-gray-50 rounded">
                    No candidates registered yet. Add students as candidates above.
                  </div>
                )}

              </div>

            )}

          </div>
        ))}
        </div>

      </div>


      {/* CLOSED ELECTIONS - HIDDEN FOR STUDENTS */}
      {/* Only show closed elections to admin, hod, teacher - NOT for students */}
      {(userRole === "admin" || userRole === "hod" || userRole === "teacher") && (
        <div className="bg-white rounded-xl border p-4 mt-4">

          <div className="font-bold mb-3">
            Closed Elections ({closed.length})
          </div>

          {closed.length === 0 && (

            <div className="text-gray-500 text-sm">
              No closed elections
            </div>

          )}

          {closed.map(election => (
            <div
              key={election._id}
              className="border rounded-xl p-3 mb-2 opacity-70"
            >

              <div className="font-semibold">
                {election.title}
              </div>

              <div className="text-sm text-gray-600">
                Ended {new Date(election.endDate).toLocaleString()}
              </div>

              {election.candidates && election.candidates.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {election.candidates.length} candidate(s) participated
                </div>
              )}

              <button
                onClick={() => navigate(`/${userRole}/results/detail?electionId=${election._id}`)}
                className="text-sm bg-blue-600 text-white px-2 py-1 rounded mt-2"
              >
                View Results
              </button>

            </div>
          ))}

        </div>
      )}

      {/* Edit Election Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingElection(null);
                setError("");
              }}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Election</h2>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Election Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="input-base"
                  disabled={loading}
                  placeholder="Election title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="input-base"
                  disabled={loading}
                  placeholder="Election description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={editFormData.startDate}
                  min={getCurrentDateTime()}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setEditFormData({ 
                      ...editFormData, 
                      startDate: newStartDate,
                      endDate: newStartDate && editFormData.endDate && new Date(editFormData.endDate) <= new Date(newStartDate) 
                        ? "" 
                        : editFormData.endDate
                    });
                    // Clear error when user fixes the issue
                    if (error) {
                      const validationError = validateDateInputs(newStartDate, editFormData.endDate);
                      if (!validationError) setError("");
                    }
                  }}
                  className="input-base"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={editFormData.endDate}
                  min={getMinEndDateTime(editFormData.startDate)}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setEditFormData({ ...editFormData, endDate: newEndDate });
                    // Clear error when user fixes the issue
                    if (error) {
                      const validationError = validateDateInputs(editFormData.startDate, newEndDate);
                      if (!validationError) setError("");
                    }
                  }}
                  className="input-base"
                  disabled={loading}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleUpdateElection}
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? "Updating..." : "Update Election"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {(showStartTimePicker || showEndTimePicker) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                if (showStartTimePicker) {
                  setShowStartTimePicker(false);
                } else {
                  setShowEndTimePicker(false);
                }
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Select {showStartTimePicker ? 'Start' : 'End'} Time
            </h3>
            
            <div className="space-y-4">
              {/* Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                  {generateHours().map(hour => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleTimeSelect(showStartTimePicker ? 'start' : 'end', 'hours', hour)}
                      className={`p-2 text-sm rounded ${
                        (showStartTimePicker ? startTime.hours : endTime.hours) === hour
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Minutes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minutes</label>
                <div className="grid grid-cols-4 gap-2">
                  {generateMinutes().map(minute => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeSelect(showStartTimePicker ? 'start' : 'end', 'minutes', minute)}
                      className={`p-2 text-sm rounded ${
                        (showStartTimePicker ? startTime.minutes : endTime.minutes) === minute
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Selected Time Display */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-mono text-gray-900">
                  {(showStartTimePicker ? startTime.hours : endTime.hours) || '00'}:
                  {(showStartTimePicker ? startTime.minutes : endTime.minutes) || '00'}
                </div>
                <div className="text-xs text-gray-500 mt-1">24-hour format</div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => applyTimeSelection(showStartTimePicker ? 'start' : 'end')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!((showStartTimePicker ? startTime.hours : endTime.hours) && 
                          (showStartTimePicker ? startTime.minutes : endTime.minutes))}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Shell>

  );

}