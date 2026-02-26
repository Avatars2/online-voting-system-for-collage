import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { useToast } from "../../components/UI/Toast";

export default function ElectionCreate() {
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    level: "global",
    department: "",
    class: "",
  });
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [candidatePosition, setCandidatePosition] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchElections = async () => {
    try {
      const res = await adminAPI.elections.list();
      setElections(res.data || []);
    } catch {
      setElections([]);
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptRes, studentRes] = await Promise.all([
        adminAPI.departments.list(),
        adminAPI.students.list(),
      ]);
      setDepartments(deptRes.data || []);
      setStudents(studentRes.data || []);
    } catch {
      setDepartments([]);
      setStudents([]);
    }
  };

  useEffect(() => {
    fetchElections();
    fetchMeta();
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      if (!formData.department) {
        setClasses([]);
        return;
      }
      try {
        const res = await adminAPI.classes.list(formData.department);
        setClasses(res.data || []);
      } catch {
        setClasses([]);
      }
    };
    loadClasses();
  }, [formData.department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "level") {
        next.department = "";
        next.class = "";
      }
      if (name === "department") {
        next.class = "";
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      showError("Election title is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || "",
        level: formData.level,
      };
      if (formData.startDate) payload.startDate = new Date(formData.startDate);
      if (formData.endDate) payload.endDate = new Date(formData.endDate);
      if (formData.level === "department") payload.department = formData.department;
      if (formData.level === "class") payload.class = formData.class;
      
      await adminAPI.elections.create(payload);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        level: "global",
        department: "",
        class: "",
      });
      
      success('Election created successfully!');
      fetchElections();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async () => {
    if (!selectedElection || !selectedStudent) {
      showError("Select an election and student");
      return;
    }
    setLoading(true);
    try {
      await adminAPI.elections.addCandidate(selectedElection, {
        userId: selectedStudent,
        position: candidatePosition.trim() || "Candidate",
      });
      setSelectedStudent("");
      setCandidatePosition("");
      success("Candidate added successfully!");
      fetchElections();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  const selectedElectionObj = elections.find((e) => e._id === selectedElection);
  const eligibleStudents = students.filter((s) => {
    if (!selectedElectionObj) return false;
    if (!selectedElectionObj.level || selectedElectionObj.level === "global") return true;
    if (selectedElectionObj.level === "department") {
      return s.department?._id === selectedElectionObj.department?._id;
    }
    if (selectedElectionObj.level === "class") {
      return s.class?._id === selectedElectionObj.class?._id;
    }
    return true;
  });

  // Filter elections for candidate addition - only show elections that haven't started
  const now = new Date();
  const upcomingElections = elections.filter(e => {
    const startDate = e.startDate ? new Date(e.startDate) : null;
    return !startDate || startDate > now;
  });

  return (
    <AdminMobileShell
      title="Election Hub"
      subtitle="Live polling & governance"
      headerColor="bg-gradient-to-r from-indigo-600 to-purple-700"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Create New Election</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Election Level</label>
            <select
              className="input-base"
              name="level"
              value={formData.level}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="global">All College (Global)</option>
              <option value="department">Specific Department</option>
              <option value="class">Specific Class</option>
            </select>
          </div>

          {formData.level === "department" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                className="input-base"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.level === "class" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  className="input-base"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  className="input-base"
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  disabled={loading || !formData.department}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Election Title</label>
            <EnhancedInput
              type="text"
              placeholder="e.g., President Election 2024"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <EnhancedInput
              type="textarea"
              placeholder="Election description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <EnhancedInput
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <EnhancedInput
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>
          
          <EnhancedButton
            onClick={handleCreate}
            disabled={loading}
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {loading ? "Creating Election..." : "Create Election"}
          </EnhancedButton>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Add Candidates</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Election</label>
            <select
              className="input-base mb-4"
              value={selectedElection || ""}
              onChange={(e) => setSelectedElection(e.target.value || null)}
            >
              <option value="">Select Election</option>
              {upcomingElections.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}{" "}
                  {e.level === "department"
                    ? `• Dept`
                    : e.level === "class"
                      ? `• Class`
                      : `• Global`}
                  {e.startDate && ` • Starts: ${new Date(e.startDate).toLocaleDateString()}`}
                </option>
              ))}
            </select>
            <div className="space-y-3 mb-4">
              <select
                className="input-base"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={!selectedElection}
              >
                <option value="">Select Student</option>
                {eligibleStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.studentId ? `(${s.studentId})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="input-base"
                placeholder="Position"
                value={candidatePosition}
                onChange={(e) => setCandidatePosition(e.target.value)}
              />
              <EnhancedButton
                onClick={handleAddCandidate}
                disabled={loading || !selectedElection}
                loading={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? "Adding..." : "Add Candidate"}
              </EnhancedButton>
            </div>
            <div className="space-y-2">
              {upcomingElections.map((e) => (
                <div key={e._id} className="text-sm text-gray-600">
                  <strong>{e.title}</strong>:{" "}
                  {e.candidateCount || 0} candidates
                  {e.startDate && ` • Starts: ${new Date(e.startDate).toLocaleDateString()}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminMobileShell>
  );
}
